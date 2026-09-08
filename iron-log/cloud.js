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
  let outbox = { logs: {}, dels: {}, split: null, profile: null };
  const obKey = () => `ironlog.outbox.${session ? session.user.id : 'anon'}`;
  function loadOutbox() {
    try { outbox = JSON.parse(localStorage.getItem(obKey())) || { logs: {}, dels: {}, split: null, profile: null }; }
    catch { outbox = { logs: {}, dels: {}, split: null, profile: null }; }
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
    const prof = { id: session.user.id, username: String(username).trim(), display_name: displayName || String(username).trim(), unit: unit || 'lb', is_public: true, stats: {}, top_lifts: [] };
    const { error: pe } = await sb.from('profiles').insert(prof);
    if (pe) {
      if (/duplicate|unique/i.test(pe.message)) throw new Error('That username is already taken.');
      throw new Error(pe.message);
    }
    await sb.from('splits').insert({ user_id: session.user.id, days: days || [] });
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

  async function listUsers() {
    if (!enabled) return [];
    const { data, error } = await sb.from('profiles')
      .select('id,username,display_name,unit,is_public,stats,top_lifts,created_at')
      .eq('is_public', true).order('updated_at', { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data || [];
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
    pushLog, deleteLog, pushSplit, pushProfile, listUsers, getUser, flush };
})();
