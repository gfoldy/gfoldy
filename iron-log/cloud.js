/* ==========================================================================
   Iron Log — cloud layer (Supabase). Optional: if config.js has no URL/key,
   Cloud.enabled is false and the app runs local-only exactly as before.

   Accounts use username + password. Supabase Auth is email-based, so we map a
   username to a synthetic email (<username>@ironlog.app); no email is ever
   sent (email confirmation must be turned OFF in the Supabase dashboard).

   Writes are optimistic: the app updates local state immediately and hands the
   change to a small offline OUTBOX here, which flushes to Supabase now (if
   online) or later (on reconnect).
   ========================================================================== */
'use strict';

const Cloud = (() => {
  const cfg = window.IRONLOG_CONFIG || {};
  const hasKeys = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const enabled = hasKeys && !!(window.supabase && window.supabase.createClient);
  const EMAIL_DOMAIN = 'ironlog.app';
  const emailFor = (u) => `${String(u).trim().toLowerCase()}@${EMAIL_DOMAIN}`;

  let sb = null, session = null;
  if (enabled) {
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'ironlog.auth' },
    });
  }

  // ---- log row <-> local record shape ------------------------------------
  const rowFromRec = (r) => ({
    id: r.id, user_id: session && session.user.id, date: r.date, exercise: r.exercise,
    muscle: r.muscle || null, set_index: r.setIndex | 0,
    weight: r.weight == null ? null : r.weight, reps: r.reps == null ? null : r.reps,
    done: !!r.done, updated_at: new Date().toISOString(),
  });
  const recFromRow = (row) => ({
    id: row.id, profileId: row.user_id, date: row.date, exercise: row.exercise,
    muscle: row.muscle || 'Other', setIndex: row.set_index | 0,
    weight: row.weight == null ? null : Number(row.weight),
    reps: row.reps == null ? null : Number(row.reps), done: !!row.done,
  });

  // ---- offline outbox ----------------------------------------------------
  let outbox = { logs: {}, dels: {}, split: null, profile: null, acts: {}, actDels: {} };
  const obKey = () => `ironlog.outbox.${session ? session.user.id : 'anon'}`;
  function loadOutbox() {
    try { outbox = JSON.parse(localStorage.getItem(obKey())) || { logs: {}, dels: {}, split: null, profile: null, acts: {}, actDels: {} }; }
    catch { outbox = { logs: {}, dels: {}, split: null, profile: null, acts: {}, actDels: {} }; }
  }
  function saveOutbox() { try { localStorage.setItem(obKey(), JSON.stringify(outbox)); } catch {} }

  let flushTimer = null;
  function scheduleFlush() { clearTimeout(flushTimer); flushTimer = setTimeout(flush, 400); }
  let flushing = false;
  async function flush() {
    if (!enabled || !session || flushing) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    flushing = true;
    try {
      // logs upserts
      const rows = Object.values(outbox.logs);
      if (rows.length) {
        const { error } = await sb.from('logs').upsert(rows, { onConflict: 'id' });
        if (!error) { outbox.logs = {}; saveOutbox(); }
      }
      // log deletes
      const dels = Object.keys(outbox.dels);
      if (dels.length) {
        const { error } = await sb.from('logs').delete().in('id', dels);
        if (!error) { outbox.dels = {}; saveOutbox(); }
      }
      // split
      if (outbox.split) {
        const { error } = await sb.from('splits').upsert(
          { user_id: session.user.id, days: outbox.split, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' });
        if (!error) { outbox.split = null; saveOutbox(); }
      }
      // profile (stats/settings)
      if (outbox.profile) {
        const patch = { id: session.user.id, ...outbox.profile, updated_at: new Date().toISOString() };
        const { error } = await sb.from('profiles').upsert(patch, { onConflict: 'id' });
        if (!error) { outbox.profile = null; saveOutbox(); }
      }
      // activity events
      const acts = Object.values(outbox.acts);
      if (acts.length) {
        const { error } = await sb.from('activity').upsert(acts, { onConflict: 'id' });
        if (!error) { outbox.acts = {}; saveOutbox(); }
      }
      const actDels = Object.keys(outbox.actDels);
      if (actDels.length) {
        const { error } = await sb.from('activity').delete().in('id', actDels);
        if (!error) { outbox.actDels = {}; saveOutbox(); }
      }
    } catch (e) { /* stay queued; will retry */ }
    flushing = false;
  }

  if (enabled && typeof window !== 'undefined') {
    window.addEventListener('online', flush);
    sb.auth.onAuthStateChange((_e, s) => { session = s; });
  }

  // ---- public API --------------------------------------------------------
  async function init() {
    if (!enabled) return null;
    const { data } = await sb.auth.getSession();
    session = data.session || null;
    if (session) { loadOutbox(); flush(); }
    return session;
  }

  function user() { return session ? { id: session.user.id } : null; }

  async function signUp({ username, password, displayName, unit, days }) {
    if (!enabled) throw new Error('Backend not configured');
    const { data, error } = await sb.auth.signUp({ email: emailFor(username), password });
    if (error) {
      if (/registered|already/i.test(error.message)) throw new Error('That username is already taken.');
      throw new Error(error.message);
    }
    session = data.session;
    if (!session) throw new Error('Account created, but sign-in did not complete. In Supabase → Authentication → Sign In / Providers, turn OFF "Confirm email", then try signing in.');
    loadOutbox();
    const prof = { id: session.user.id, username: String(username).trim(), display_name: displayName || String(username).trim(), unit: unit || 'lb', is_public: true, stats: {}, top_lifts: [], lifts: {} };
    const { error: pe } = await sb.from('profiles').insert(prof);
    if (pe) {
      if (/duplicate|unique/i.test(pe.message)) throw new Error('That username is already taken.');
      throw new Error(pe.message);
    }
    await sb.from('splits').insert({ user_id: session.user.id, days: days || [] });
    try {
      await sb.from('activity').insert({ id: 'join_' + session.user.id, user_id: session.user.id,
        username: prof.username, display_name: prof.display_name, type: 'joined', data: {}, created_at: new Date().toISOString() });
    } catch (e) { /* non-fatal */ }
    return { id: session.user.id, username: prof.username };
  }

  async function signIn({ username, password }) {
    if (!enabled) throw new Error('Backend not configured');
    const { data, error } = await sb.auth.signInWithPassword({ email: emailFor(username), password });
    if (error) throw new Error(/invalid/i.test(error.message) ? 'Wrong username or password.' : error.message);
    session = data.session; loadOutbox(); flush();
    return { id: session.user.id };
  }

  async function signOut() { if (enabled && sb) await sb.auth.signOut(); session = null; }

  async function pullMine() {
    if (!enabled || !session) return null;
    const uid = session.user.id;
    const [{ data: prof }, { data: split }, { data: logs }] = await Promise.all([
      sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
      sb.from('splits').select('days').eq('user_id', uid).maybeSingle(),
      sb.from('logs').select('*').eq('user_id', uid),
    ]);
    return {
      profile: prof || null,
      days: (split && split.days) || [],
      logs: (logs || []).map(recFromRow),
    };
  }

  function pushLog(rec) { if (!enabled) return; delete outbox.dels[rec.id]; outbox.logs[rec.id] = rowFromRec(rec); saveOutbox(); scheduleFlush(); }
  function deleteLog(id) { if (!enabled) return; delete outbox.logs[id]; outbox.dels[id] = 1; saveOutbox(); scheduleFlush(); }
  function pushSplit(days) { if (!enabled) return; outbox.split = days; saveOutbox(); scheduleFlush(); }
  function pushProfile(patch) { if (!enabled) return; outbox.profile = { ...(outbox.profile || {}), ...patch }; saveOutbox(); scheduleFlush(); }
  function pushActivity(row) { if (!enabled || !session) return; row.user_id = session.user.id; delete outbox.actDels[row.id]; outbox.acts[row.id] = row; saveOutbox(); scheduleFlush(); }
  function deleteActivity(id) { if (!enabled) return; delete outbox.acts[id]; outbox.actDels[id] = 1; saveOutbox(); scheduleFlush(); }
  async function feed(ids) {
    if (!enabled || !ids || !ids.length) return [];
    const { data, error } = await sb.from('activity').select('*').in('user_id', ids)
      .order('created_at', { ascending: false }).limit(60);
    if (error) throw new Error(error.message);
    return data || [];
  }

  async function listUsers() {
    if (!enabled) return [];
    const { data, error } = await sb.from('profiles')
      .select('id,username,display_name,unit,is_public,stats,top_lifts,lifts,created_at')
      .eq('is_public', true).order('updated_at', { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data || [];
  }

  // ---- follows -----------------------------------------------------------
  async function myFollows() {
    if (!enabled || !session) return new Set();
    const { data, error } = await sb.from('follows').select('followee_id').eq('follower_id', session.user.id);
    if (error) return new Set();
    return new Set((data || []).map((r) => r.followee_id));
  }
  async function follow(id) {
    if (!enabled || !session) return;
    await sb.from('follows').insert({ follower_id: session.user.id, followee_id: id });
  }
  async function unfollow(id) {
    if (!enabled || !session) return;
    await sb.from('follows').delete().eq('follower_id', session.user.id).eq('followee_id', id);
  }
  // counts + whether this user follows me
  async function followInfo(id) {
    if (!enabled || !session) return { followers: 0, following: 0, followsMe: false };
    const me = session.user.id;
    const [followers, following, back] = await Promise.all([
      sb.from('follows').select('follower_id', { count: 'exact', head: true }).eq('followee_id', id),
      sb.from('follows').select('followee_id', { count: 'exact', head: true }).eq('follower_id', id),
      sb.from('follows').select('follower_id').eq('follower_id', id).eq('followee_id', me).limit(1),
    ]);
    return {
      followers: followers.count || 0,
      following: following.count || 0,
      followsMe: !!(back.data && back.data.length),
    };
  }

  async function getUser(id) {
    if (!enabled) return null;
    const [{ data: prof }, { data: split }, { data: logs }] = await Promise.all([
      sb.from('profiles').select('*').eq('id', id).maybeSingle(),
      sb.from('splits').select('days').eq('user_id', id).maybeSingle(),
      sb.from('logs').select('*').eq('user_id', id),
    ]);
    if (!prof) return null;
    return { profile: prof, days: (split && split.days) || [], logs: (logs || []).map(recFromRow) };
  }

  return { enabled, init, user, signUp, signIn, signOut, pullMine,
    pushLog, deleteLog, pushSplit, pushProfile, listUsers, getUser, flush,
    myFollows, follow, unfollow, followInfo, pushActivity, deleteActivity, feed };
})();
