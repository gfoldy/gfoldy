/* ==========================================================================
   Iron Log — a mobile-first PWA workout tracker.
   Vanilla JS, no dependencies. All data lives on-device in IndexedDB,
   scoped by local profile. No backend, no syncing.
   ========================================================================== */
'use strict';

/* --------------------------------------------------------------------------
   Constants: muscle groups + the starter split (loaded on request only).
   -------------------------------------------------------------------------- */
const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs',
  'Calves', 'Glutes', 'Core', 'Traps', 'Forearms', 'Other'];

// weekday: 0=Sun … 6=Sat (matches Date.getDay()). null = not tied to a weekday.
function ex(name, muscle, sets, reps) { return { id: uid(), name, muscle, sets, reps }; }
function STARTER_SPLIT() {
  return [
    { id: uid(), name: 'Chest (Strength) · Shoulders (Light) · Triceps', weekday: 1, exercises: [
      ex('Barbell Bench Press', 'Chest', 4, '4-6'),
      ex('Incline DB Press', 'Chest', 3, '6-8'),
      ex('Weighted Dips', 'Chest', 3, '8-10'),
      ex('Cable Lateral Raise', 'Shoulders', 3, '12-15'),
      ex('Rear Delt Fly', 'Shoulders', 3, '12-15'),
      ex('Close-Grip Bench or Skull Crusher', 'Triceps', 3, '8-10'),
      ex('Rope Pushdown', 'Triceps', 3, '10-12'),
    ]},
    { id: uid(), name: 'Back (Thickness) · Biceps', weekday: 2, exercises: [
      ex('Deadlift or Rack Pull', 'Back', 3, '5'),
      ex('Barbell or T-Bar Row', 'Back', 4, '8-10'),
      ex('Chest-Supported Row or Seated Cable Row', 'Back', 3, '10-12'),
      ex('Barbell Curl', 'Biceps', 3, '8-10'),
      ex('Incline DB Curl', 'Biceps', 3, '10-12'),
    ]},
    { id: uid(), name: 'Legs', weekday: 3, exercises: [
      ex('Back Squat', 'Legs', 4, '6-8'),
      ex('Romanian Deadlift', 'Legs', 3, '8-10'),
      ex('Leg Press', 'Legs', 3, '10-12'),
      ex('Leg Curl', 'Legs', 3, '10-12'),
      ex('Walking Lunges', 'Legs', 3, '10/leg'),
      ex('Standing Calf Raise', 'Calves', 4, '12-15'),
    ]},
    { id: uid(), name: 'Chest (Width) · Shoulders (Heavy) · Triceps', weekday: 4, exercises: [
      ex('Incline Cable Fly', 'Chest', 3, '12-15'),
      ex('Pec Deck', 'Chest', 3, '12-15'),
      ex('Low-to-High Cable Fly', 'Chest', 3, '12-15'),
      ex('Seated Barbell or DB OHP', 'Shoulders', 4, '6-8'),
      ex('Arnold Press', 'Shoulders', 3, '8-10'),
      ex('Overhead DB Extension', 'Triceps', 3, '10-12'),
      ex('Dips or Pushdown Variation', 'Triceps', 3, '10-12'),
    ]},
    { id: uid(), name: 'Back (Width/Lats) · Biceps', weekday: 5, exercises: [
      ex('Wide-Grip Lat Pulldown', 'Back', 4, '10-12'),
      ex('Straight-Arm Pulldown', 'Back', 3, '12-15'),
      ex('Cable Pullover or Wide DB Row', 'Back', 3, '12-15'),
      ex('Hammer Curl', 'Biceps', 3, '10-12'),
      ex('Cable Curl', 'Biceps', 3, '12-15'),
    ]},
  ];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* --------------------------------------------------------------------------
   Small utilities
   -------------------------------------------------------------------------- */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function num(v) { const n = parseFloat(v); return isNaN(n) ? null : n; }
function todayStr() { return dateToStr(new Date()); }
function dateToStr(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}
function parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function weekdayOf(dateStr) { return parseDate(dateStr).getDay(); }
function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = x.getDay(); // 0=Sun
  const diff = (wd === 0 ? -6 : 1 - wd);
  x.setDate(x.getDate() + diff);
  return x;
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function fmtShort(dateStr) { const d = parseDate(dateStr); return `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`; }
function fmtNum(n) { return (Math.round(n * 100) / 100).toLocaleString('en-US'); }

/* --------------------------------------------------------------------------
   IndexedDB wrapper. Stores: profiles, splits (by profileId), logs.
   -------------------------------------------------------------------------- */
const DB = (() => {
  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open('ironlog', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('profiles')) db.createObjectStore('profiles', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('splits')) db.createObjectStore('splits', { keyPath: 'profileId' });
        if (!db.objectStoreNames.contains('logs')) {
          const s = db.createObjectStore('logs', { keyPath: 'id' });
          s.createIndex('profileId', 'profileId', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }
  function tx(store, mode, fn) {
    return open().then((db) => new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      let out;
      Promise.resolve(fn(s)).then((r) => { out = r; });
      t.oncomplete = () => resolve(out);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    }));
  }
  const reqP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  return {
    getAll: (store) => tx(store, 'readonly', (s) => reqP(s.getAll())),
    get: (store, key) => tx(store, 'readonly', (s) => reqP(s.get(key))),
    put: (store, val) => tx(store, 'readwrite', (s) => reqP(s.put(val))),
    del: (store, key) => tx(store, 'readwrite', (s) => reqP(s.delete(key))),
    logsByProfile: (pid) => tx('logs', 'readonly', (s) => reqP(s.index('profileId').getAll(pid))),
    clearAll: () => tx('profiles', 'readwrite', () => {}).then(() =>
      open().then((db) => new Promise((res, rej) => {
        const t = db.transaction(['profiles', 'splits', 'logs'], 'readwrite');
        t.objectStore('profiles').clear();
        t.objectStore('splits').clear();
        t.objectStore('logs').clear();
        t.oncomplete = () => res(); t.onerror = () => rej(t.error);
      }))),
  };
})();

/* --------------------------------------------------------------------------
   App state (in-memory cache of the current profile's data)
   -------------------------------------------------------------------------- */
const state = {
  profiles: [],
  profileId: null,
  profile: null,
  split: [],            // array of day objects for current profile
  logs: [],             // all log records for current profile
  tab: 'today',
  selectedDate: todayStr(),
  selectedDayId: null,  // which split day is shown on Today
  onboardName: '',
  progRange: 8,         // Progress tab: weeks shown (4/8/12/'all')
  progExercise: null,   // Progress tab: exercise selected for the strength chart
  mode: 'local',        // 'local' or 'cloud'
  people: null,         // People tab: cached user list
  peopleErr: null,
  peopleFilter: 'discover', // 'discover' | 'following'
  viewUserId: null,     // People tab: which user is being viewed
  viewUser: null,       // People tab: loaded {profile, days, logs}
  viewFollow: null,     // People tab: {followers, following, followsMe} for viewed user
  follows: null,        // Set of user ids the current user follows
  ranksScope: 'all',    // Ranks tab: 'all' | 'following'
  ranksMetric: 'lift',  // 'lift' | 'volume' | 'sessions' | 'sets'
  ranksLift: null,      // selected exercise for the per-lift board
  authCreate: false,    // auth screen: false = sign in, true = create account
  authErr: null,
};

const CUR_KEY = 'ironlog.currentProfile';

/* --------------------------------------------------------------------------
   Data access helpers
   -------------------------------------------------------------------------- */
async function loadProfiles() { state.profiles = await DB.getAll('profiles'); return state.profiles; }

async function loadProfileData(pid) {
  state.profileId = pid;
  state.profile = state.profiles.find((p) => p.id === pid) || null;
  const splitRec = await DB.get('splits', pid);
  state.split = splitRec ? splitRec.days : [];
  state.logs = await DB.logsByProfile(pid);
  localStorage.setItem(CUR_KEY, pid);
}

async function saveSplit() {
  await DB.put('splits', { profileId: state.profileId, days: state.split });
  Cloud.pushSplit(state.split);
}

// Estimated 1-rep max (Epley) — lets leaderboards compare lifts fairly across
// different rep ranges.
const e1rm = (w, r) => Math.round(w * (1 + r / 30));

// Summary denormalised onto the cloud profile so the People and Ranks tabs can
// show metrics/leaderboards without pulling everyone's full log history.
function computeSummary() {
  const c = state.logs.filter(isCompleted);
  const sessions = new Set(c.map((l) => l.date)).size;
  const sets = c.length;
  const volume = Math.round(c.reduce((a, l) => a + (l.weight || 0) * (l.reps || 0), 0));
  const lifts = {};
  c.filter((l) => l.weight > 0 && l.reps > 0).forEach((l) => {
    const e = e1rm(l.weight, l.reps);
    const cur = lifts[l.exercise];
    if (!cur || e > cur.e1rm) lifts[l.exercise] = { weight: l.weight, reps: l.reps, date: l.date, e1rm: e };
  });
  const top_lifts = Object.entries(lifts)
    .map(([exercise, v]) => ({ exercise, weight: v.weight, reps: v.reps, date: v.date, e1rm: v.e1rm }))
    .sort((a, b) => b.e1rm - a.e1rm).slice(0, 4);
  return { stats: { sessions, sets, volume }, top_lifts, lifts };
}
let statsTimer = null;
function syncStats() {
  if (!Cloud.enabled) return;
  clearTimeout(statsTimer);
  statsTimer = setTimeout(() => Cloud.pushProfile(computeSummary()), 700);
}

async function createProfile(name, seedStarter) {
  const p = { id: uid(), name: name.trim() || 'Athlete', unit: 'lb', createdAt: Date.now() };
  await DB.put('profiles', p);
  const days = seedStarter ? STARTER_SPLIT() : [];
  await DB.put('splits', { profileId: p.id, days });
  await loadProfiles();
  await loadProfileData(p.id);
  return p;
}

// Find or create (in memory only) the record for one logged set.
function memSet(dateStr, exName, muscle, setIndex) {
  let rec = state.logs.find((l) => l.date === dateStr && l.exercise === exName && l.setIndex === setIndex);
  if (!rec) {
    rec = { id: uid(), profileId: state.profileId, date: dateStr, exercise: exName,
      muscle: muscle || 'Other', setIndex, weight: null, reps: null, done: false };
    state.logs.push(rec);
  }
  if (muscle) rec.muscle = muscle;
  return rec;
}

// Upsert one logged set and persist it. patch keys: weight, reps, done.
async function upsertSet(dateStr, exName, muscle, setIndex, patch) {
  const rec = memSet(dateStr, exName, muscle, setIndex);
  Object.assign(rec, patch);
  rec.updatedAt = Date.now();
  await DB.put('logs', rec);
  Cloud.pushLog(rec); syncStats();
  return rec;
}

async function deleteSet(rec) {
  state.logs = state.logs.filter((l) => l.id !== rec.id);
  await DB.del('logs', rec.id);
  Cloud.deleteLog(rec.id); syncStats();
}

function setsFor(dateStr, exName) {
  return state.logs.filter((l) => l.date === dateStr && l.exercise === exName)
    .sort((a, b) => a.setIndex - b.setIndex);
}
const isCompleted = (l) => !!l.done;
const unit = () => (state.profile && state.profile.unit) || 'lb';

/* --------------------------------------------------------------------------
   SVG icon snippets
   -------------------------------------------------------------------------- */
const I = {
  today: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>',
  progress: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  split: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5h11M6.5 6.5V4M6.5 6.5V9M17.5 6.5V4M17.5 6.5V9M2 6.5h2M20 6.5h2M6.5 17.5h11M6.5 17.5V15M6.5 17.5V20M17.5 17.5V15M17.5 17.5V20M2 17.5h2M20 17.5h2"/></svg>',
  people: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 20a5.5 5.5 0 0 0-3-4.9"/></svg>',
  ranks: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"/></svg>',
};

/* --------------------------------------------------------------------------
   Rendering
   -------------------------------------------------------------------------- */
const root = document.getElementById('root');

function render() {
  if (!state.profileId) { if (Cloud.enabled) renderAuth(); else renderOnboard(); return; }
  const y = window.scrollY;
  root.innerHTML = `
    <div id="app">
      ${appbar()}
      <main id="view">${viewHtml()}</main>
      ${tabbar()}
    </div>
    <div id="modal"></div>`;
  window.scrollTo(0, y);
}

function appbar() {
  return `<header class="appbar">
    <div class="brand"><img class="mark" src="./icons/icon-192.png" alt="" />Iron<b>Log</b></div>
    <button class="profile-chip" data-act="profile:open" aria-label="Account & profile">
      <span class="who">${esc(state.profile ? state.profile.name : '')}</span><span class="chev">▾</span>
    </button>
  </header>`;
}

function tabbar() {
  const t = (id, label, icon) =>
    `<button class="${state.tab === id ? 'active' : ''}" data-act="nav:${id}">${icon}<span>${label}</span></button>`;
  return `<nav class="tabbar">
    ${t('today', 'Today', I.today)}
    ${t('progress', 'Progress', I.progress)}
    ${t('split', 'Split', I.split)}
    ${Cloud.enabled ? t('people', 'People', I.people) : ''}
    ${Cloud.enabled ? t('ranks', 'Ranks', I.ranks) : ''}
  </nav>`;
}

function viewHtml() {
  if (state.tab === 'today') return todayView();
  if (state.tab === 'progress') return progressView();
  if (state.tab === 'split') return splitView();
  if (state.tab === 'people') return peopleView();
  if (state.tab === 'ranks') return ranksView();
  return '';
}

/* ---- Today --------------------------------------------------------------- */
function autoDayForDate(dateStr) {
  const wd = weekdayOf(dateStr);
  const match = state.split.find((d) => d.weekday === wd);
  return match ? match.id : (state.split[0] ? state.split[0].id : null);
}

function todayView() {
  const date = state.selectedDate;
  if (state.selectedDayId === undefined || state.selectedDayId === null) state.selectedDayId = autoDayForDate(date);
  // Ensure selected day still exists
  if (state.selectedDayId !== 'rest' && !state.split.find((d) => d.id === state.selectedDayId)) {
    state.selectedDayId = autoDayForDate(date);
  }
  const day = state.split.find((d) => d.id === state.selectedDayId) || null;

  const daySelect = `<select data-act="today:daychange" aria-label="Training day">
    ${state.split.map((d) => `<option value="${d.id}" ${d.id === state.selectedDayId ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}
    <option value="rest" ${state.selectedDayId === 'rest' ? 'selected' : ''}>Rest / other day</option>
  </select>`;

  const wdName = WEEKDAYS_LONG[weekdayOf(date)];
  let body = '';
  let dayDone = 0, dayTarget = 0;

  if (state.split.length === 0) {
    body = emptyState('🏋️', 'No split yet', 'Head to the Split tab to build your training program, then it will show up here.',
      'Go to Split', 'nav:split');
  } else if (state.selectedDayId === 'rest' || !day) {
    body = `<div class="card"><p class="muted" style="text-align:center;margin:8px 0">Rest / unplanned day. Add an exercise below to log anything you did.</p></div>`;
  } else {
    // group exercises by muscle, preserving order of first appearance
    const groups = [];
    const idx = {};
    day.exercises.forEach((e) => {
      if (!(e.muscle in idx)) { idx[e.muscle] = groups.length; groups.push({ muscle: e.muscle, items: [] }); }
      groups[idx[e.muscle]].items.push(e);
    });
    body = groups.map((g) => `
      <h2 class="section">${esc(g.muscle)}</h2>
      <div class="card">${g.items.map((e) => {
        const r = exerciseBlock(date, e.name, e.muscle, e.sets, e.reps);
        dayDone += r.done; dayTarget += r.target;
        return r.html;
      }).join('')}</div>`).join('');
  }

  // include ad-hoc logged exercises for this date that aren't in the plan
  const planned = new Set((day ? day.exercises : []).map((e) => e.name));
  const adhocNames = [...new Set(state.logs.filter((l) => l.date === date && !planned.has(l.exercise)).map((l) => l.exercise))];
  let adhocHtml = '';
  if (adhocNames.length) {
    adhocHtml = `<h2 class="section">Added this session</h2><div class="card">${adhocNames.map((n) => {
      const m = (state.logs.find((l) => l.date === date && l.exercise === n) || {}).muscle || 'Other';
      const r = exerciseBlock(date, n, m, 0, '', true);
      dayDone += r.done; dayTarget += r.target;
      return r.html;
    }).join('')}</div>`;
  }

  const dayPct = dayTarget > 0 ? `${dayDone}/${dayTarget} sets` : `${dayDone} sets`;
  const complete = dayTarget > 0 && dayDone >= dayTarget;

  return `
    <div class="day-head">
      <div class="daysel">
        <label class="field" style="margin-bottom:8px">
          <span>${wdName}</span>
          <input type="date" value="${date}" data-act="today:date" />
        </label>
        ${state.split.length ? daySelect : ''}
        <div class="day-progress ${complete ? 'complete' : ''}" id="day-prog">Day: <b>${dayPct}</b>${complete ? ' ✓' : ''}</div>
      </div>
    </div>
    ${body}
    ${adhocHtml}
    <button class="btn ghost block" data-act="today:addex" style="margin-top:6px">+ Add exercise</button>
  `;
}

// Returns { html, done, target } for one exercise's set rows.
function exerciseBlock(date, name, muscle, targetSets, reps, adhoc) {
  const logs = setsFor(date, name);
  const maxIdx = logs.reduce((m, l) => Math.max(m, l.setIndex), -1);
  const rows = Math.max(targetSets, maxIdx + 1);
  const doneCount = logs.filter(isCompleted).length;
  const badgeDone = targetSets > 0 && doneCount >= targetSets;
  let rowsHtml = '';
  for (let i = 0; i < rows; i++) {
    const l = logs.find((x) => x.setIndex === i) || {};
    const extra = i >= targetSets;
    rowsHtml += setRow(name, muscle, i, l, extra);
  }
  const targetLabel = targetSets > 0 ? `${targetSets} × ${esc(reps || '—')}` : (adhoc ? 'added' : '');
  const badge = targetSets > 0
    ? `<span class="progress-badge ${badgeDone ? 'done' : ''}" data-prog="${esc(name)}">${doneCount}/${targetSets}</span>`
    : `<span class="progress-badge ${doneCount ? 'done' : ''}" data-prog="${esc(name)}">${doneCount} done</span>`;
  const html = `
    <div class="exercise" data-exwrap="${esc(name)}">
      <div class="ex-head">
        <div><div class="ex-name">${esc(name)}</div><div class="ex-target">${targetLabel}</div></div>
        ${badge}
      </div>
      <div class="setrows" data-setrows="${esc(name)}">${rowsHtml}</div>
      <button class="subtle-link" data-act="today:addset" data-ex="${esc(name)}" data-muscle="${esc(muscle)}">+ Add set</button>
    </div>`;
  return { html, done: doneCount, target: targetSets };
}

function setRow(name, muscle, i, l, extra) {
  const w = l.weight != null ? l.weight : '';
  const r = l.reps != null ? l.reps : '';
  const done = !!l.done;
  return `<div class="setrow ${done ? 'done' : ''} ${extra ? 'extra' : ''}" data-row="${esc(name)}:${i}">
    <div class="snum">${i + 1}</div>
    <div class="unit-wrap">
      <input type="number" inputmode="decimal" step="0.5" min="0" placeholder="0" value="${w}"
        data-act="today:input" data-kind="weight" data-ex="${esc(name)}" data-muscle="${esc(muscle)}" data-set="${i}" aria-label="Weight set ${i + 1}" />
      <span class="unit">${unit()}</span>
    </div>
    <div class="unit-wrap">
      <input type="number" inputmode="numeric" step="1" min="0" placeholder="0" value="${r}"
        data-act="today:input" data-kind="reps" data-ex="${esc(name)}" data-muscle="${esc(muscle)}" data-set="${i}" aria-label="Reps set ${i + 1}" />
      <span class="unit">reps</span>
    </div>
    <button class="check ${done ? 'on' : ''}" data-act="today:check" data-ex="${esc(name)}" data-muscle="${esc(muscle)}" data-set="${i}" aria-label="Mark set ${i + 1} done">${I.check}</button>
  </div>`;
}

/* ---- Progress: muscle palette + chart helpers ---------------------------- */
// Fixed muscle -> categorical slot. Validated (CVD-safe) on the app's dark
// surface; assigning by muscle (not rank) keeps a body part's colour stable as
// data and the range filter change. Stacking follows this order so adjacent
// segments are the validated adjacent pairs.
const MUSCLE_ORDER = ['Chest', 'Back', 'Shoulders', 'Legs', 'Biceps', 'Triceps', 'Core', 'Calves'];
const MUSCLE_COLORS = {
  Chest: '#3987e5', Back: '#d95926', Shoulders: '#199e70', Legs: '#c98500',
  Biceps: '#d55181', Triceps: '#008300', Core: '#9085e9', Calves: '#e66767',
};
const OTHER_COLOR = '#8a8a94';
const muscleBucket = (m) => (MUSCLE_COLORS[m] ? m : 'Other');
const muscleColor = (m) => MUSCLE_COLORS[m] || OTHER_COLOR;

function niceMax(v) {
  if (v <= 5) return Math.max(1, Math.ceil(v));
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * p;
}

// Build the per-week aggregates for the selected range.
function buildWeeks(completed, range) {
  const thisMon = mondayOf(new Date());
  let n = range;
  if (range === 'all') {
    const first = completed.reduce((m, l) => (l.date < m ? l.date : m), todayStr());
    const firstMon = mondayOf(parseDate(first));
    n = Math.round((thisMon.getTime() - firstMon.getTime()) / (7 * 86400000)) + 1;
    n = Math.min(Math.max(n, 4), 26);
  }
  const weeks = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = addDays(thisMon, -7 * i);
    const s = dateToStr(start), e = dateToStr(addDays(start, 7));
    const inWk = completed.filter((l) => l.date >= s && l.date < e);
    const byMuscle = {};
    inWk.forEach((l) => { const b = muscleBucket(l.muscle); byMuscle[b] = (byMuscle[b] || 0) + 1; });
    weeks.push({
      start, label: fmtShort(s), sets: inWk.length, byMuscle,
      vol: inWk.reduce((a, l) => a + (l.weight || 0) * (l.reps || 0), 0),
      dates: new Set(inWk.map((l) => l.date)),
    });
  }
  return weeks;
}

function bucketsPresent(weeks) {
  const seen = new Set();
  weeks.forEach((w) => Object.keys(w.byMuscle).forEach((m) => seen.add(m)));
  const ordered = MUSCLE_ORDER.filter((m) => seen.has(m));
  if (seen.has('Other')) ordered.push('Other');
  return ordered;
}

function legendHtml(buckets) {
  return `<div class="legend">${buckets.map((b) =>
    `<span class="lg"><i style="background:${muscleColor(b)}"></i>${esc(b)}</span>`).join('')}</div>`;
}

// Vertical stacked bars: sets per muscle, per week.
function svgStackedBars(weeks, buckets) {
  const W = 340, H = 168, padL = 22, padR = 6, padT = 12, padB = 24;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const maxT = niceMax(Math.max(1, ...weeks.map((w) => w.sets)));
  const n = weeks.length, step = plotW / n, bw = Math.min(30, step * 0.62);
  const yFor = (v) => padT + plotH - (v / maxT) * plotH;
  let grid = '';
  [0, maxT / 2, maxT].forEach((v) => {
    grid += `<line x1="${padL}" x2="${W - padR}" y1="${yFor(v).toFixed(1)}" y2="${yFor(v).toFixed(1)}" class="sgrid"/>` +
      `<text x="${padL - 4}" y="${(yFor(v) + 3).toFixed(1)}" class="sax" text-anchor="end">${Math.round(v)}</text>`;
  });
  let bars = '';
  weeks.forEach((w, i) => {
    const cx = padL + step * i + step / 2;
    let yTop = padT + plotH;
    buckets.forEach((b) => {
      const v = w.byMuscle[b] || 0; if (!v) return;
      const h = (v / maxT) * plotH; yTop -= h;
      bars += `<rect x="${(cx - bw / 2).toFixed(1)}" y="${yTop.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0.5, h - 2).toFixed(1)}" rx="2" fill="${muscleColor(b)}" data-tip="${esc(b)} · ${v} set${v > 1 ? 's' : ''} · wk of ${w.label}"/>`;
    });
    if (w.sets) bars += `<text x="${cx.toFixed(1)}" y="${(yFor(w.sets) - 3).toFixed(1)}" class="svl" text-anchor="middle">${w.sets}</text>`;
    if (n <= 9 || i % 2 === 0) bars += `<text x="${cx.toFixed(1)}" y="${H - 7}" class="sax" text-anchor="middle">${w.label}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Sets per muscle per week">${grid}${bars}</svg>`;
}

// Vertical single-hue bars (weekly volume).
function svgVBars(weeks, color) {
  const W = 340, H = 130, padL = 30, padR = 6, padT = 12, padB = 22;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const maxV = niceMax(Math.max(1, ...weeks.map((w) => w.vol)));
  const n = weeks.length, step = plotW / n, bw = Math.min(30, step * 0.62);
  const yFor = (v) => padT + plotH - (v / maxV) * plotH;
  const kfmt = (v) => (v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k' : String(Math.round(v)));
  let out = '';
  [0, maxV].forEach((v) => {
    out += `<line x1="${padL}" x2="${W - padR}" y1="${yFor(v).toFixed(1)}" y2="${yFor(v).toFixed(1)}" class="sgrid"/>` +
      `<text x="${padL - 4}" y="${(yFor(v) + 3).toFixed(1)}" class="sax" text-anchor="end">${kfmt(v)}</text>`;
  });
  weeks.forEach((w, i) => {
    const cx = padL + step * i + step / 2;
    const h = (w.vol / maxV) * plotH;
    const recent = i === n - 1;
    out += `<rect x="${(cx - bw / 2).toFixed(1)}" y="${yFor(w.vol).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0.5, h).toFixed(1)}" rx="2" fill="${recent ? color : 'var(--gold-dim)'}" data-tip="wk of ${w.label} · ${fmtNum(Math.round(w.vol))} ${unit()}"/>`;
    if (n <= 9 || i % 2 === 0) out += `<text x="${cx.toFixed(1)}" y="${H - 7}" class="sax" text-anchor="middle">${w.label}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Weekly volume">${out}</svg>`;
}

// Single-series line: heaviest set over time for one exercise.
function svgLine(points, color) {
  const W = 340, H = 150, padL = 30, padR = 8, padT = 12, padB = 22;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const ys = points.map((p) => p.y);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (lo === hi) { lo = Math.max(0, lo - 5); hi = hi + 5; }
  const pad = (hi - lo) * 0.15; lo = Math.max(0, lo - pad); hi = hi + pad;
  const n = points.length;
  const xFor = (i) => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yFor = (v) => padT + plotH - ((v - lo) / (hi - lo)) * plotH;
  let grid = '';
  [lo, (lo + hi) / 2, hi].forEach((v) => {
    grid += `<line x1="${padL}" x2="${W - padR}" y1="${yFor(v).toFixed(1)}" y2="${yFor(v).toFixed(1)}" class="sgrid"/>` +
      `<text x="${padL - 4}" y="${(yFor(v) + 3).toFixed(1)}" class="sax" text-anchor="end">${Math.round(v)}</text>`;
  });
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)} ${yFor(p.y).toFixed(1)}`).join(' ');
  const line = `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  let marks = '';
  points.forEach((p, i) => {
    marks += `<circle cx="${xFor(i).toFixed(1)}" cy="${yFor(p.y).toFixed(1)}" r="3.2" fill="${color}" stroke="var(--bg-elev)" stroke-width="1.5"/>`;
    // wide transparent hit target for tap tooltips
    marks += `<rect x="${(xFor(i) - step2(n, plotW) / 2).toFixed(1)}" y="${padT}" width="${step2(n, plotW).toFixed(1)}" height="${plotH}" fill="transparent" data-tip="${esc(p.label)} · ${fmtNum(p.y)} ${unit()}"/>`;
    if (n <= 9 || i % 2 === 0 || i === n - 1) marks += `<text x="${xFor(i).toFixed(1)}" y="${H - 7}" class="sax" text-anchor="middle">${p.label}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Heaviest set over time">${grid}${line}${marks}</svg>`;
}
function step2(n, plotW) { return n <= 1 ? plotW : plotW / (n - 1); }

// Horizontal bars with always-visible labels (muscle balance over the range).
function hBarsHtml(items, total) {
  const max = Math.max(1, ...items.map((it) => it.value));
  return `<div class="hbars">${items.map((it) => {
    const pct = total ? Math.round((it.value / total) * 100) : 0;
    return `<div class="hbar-row" data-tip="${esc(it.label)} · ${it.value} sets · ${pct}% of work">
      <span class="hbar-l">${esc(it.label)}</span>
      <span class="hbar-track"><span class="hbar-fill" style="width:${((it.value / max) * 100).toFixed(1)}%;background:${muscleColor(it.label)}"></span></span>
      <span class="hbar-v">${it.value}<span class="hbar-pct"> ${pct}%</span></span>
    </div>`;
  }).join('')}</div>`;
}

/* ---- Progress view ------------------------------------------------------- */
function progressView() {
  const completed = state.logs.filter(isCompleted);
  if (completed.length === 0) {
    return `<h1 class="view-title">Progress</h1>` + emptyState('📈', 'Nothing logged yet',
      'Once you complete a few sets on the Today tab, your stats, charts, personal bests and habit grid will appear here.',
      'Go to Today', 'nav:today');
  }

  const range = state.progRange;
  const weeks = buildWeeks(completed, range);
  const buckets = bucketsPresent(weeks);
  const nWeeks = weeks.length;
  const rangeLabel = range === 'all' ? `${nWeeks} wks` : `${range} wks`;

  // range chips
  const chips = [4, 8, 12, 'all'].map((r) =>
    `<button class="chip ${r === range ? 'on' : ''}" data-act="prog:range" data-range="${r}">${r === 'all' ? 'All' : r + 'w'}</button>`).join('');

  // ---- Range totals
  const rangeLogs = completed.filter((l) => l.date >= dateToStr(weeks[0].start));
  const sessionDates = new Set(rangeLogs.map((l) => l.date));
  const rSets = rangeLogs.length;
  const rVol = rangeLogs.reduce((a, l) => a + (l.weight || 0) * (l.reps || 0), 0);
  const setsPerWk = Math.round(rSets / nWeeks);

  // ---- Weekly volume trend (last vs previous week in range)
  const lastV = weeks[nWeeks - 1].vol, prevV = nWeeks > 1 ? weeks[nWeeks - 2].vol : 0;
  let trend = '<span class="trend">–</span>';
  if (prevV > 0) { const pct = Math.round(((lastV - prevV) / prevV) * 100); trend = `<span class="trend ${pct >= 0 ? 'up' : 'down'}">${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)}%</span>`; }
  else if (lastV > 0) trend = `<span class="trend up">▲ new</span>`;

  // ---- Muscle balance (sets per muscle over range)
  const balance = {};
  rangeLogs.forEach((l) => { const b = muscleBucket(l.muscle); balance[b] = (balance[b] || 0) + 1; });
  const balItems = bucketsPresent(weeks).map((b) => ({ label: b, value: balance[b] || 0 }))
    .filter((it) => it.value > 0).sort((a, b) => b.value - a.value);

  // ---- Exercise progression (heaviest completed set per session date)
  const exStats = {};
  completed.filter((l) => l.weight > 0).forEach((l) => {
    (exStats[l.exercise] = exStats[l.exercise] || { dates: new Set(), byDate: {} });
    exStats[l.exercise].dates.add(l.date);
    exStats[l.exercise].byDate[l.date] = Math.max(exStats[l.exercise].byDate[l.date] || 0, l.weight);
  });
  const exNames = Object.keys(exStats).sort((a, b) => exStats[b].dates.size - exStats[a].dates.size || a.localeCompare(b));
  if (exNames.length && (!state.progExercise || !exStats[state.progExercise])) state.progExercise = exNames[0];
  let progChart = '';
  if (exNames.length) {
    const sel = state.progExercise;
    const st = exStats[sel];
    const cutoff = dateToStr(weeks[0].start);
    const dates = [...st.dates].filter((d) => d >= cutoff).sort();
    const opts = exNames.map((n) => `<option value="${esc(n)}" ${n === sel ? 'selected' : ''}>${esc(n)} (${exStats[n].dates.size})</option>`).join('');
    const picker = `<select class="prog-select" data-act="prog:exercise" aria-label="Exercise">${opts}</select>`;
    if (dates.length >= 2) {
      const points = dates.map((d) => ({ label: fmtShort(d), y: st.byDate[d] }));
      const first = st.byDate[dates[0]], lastW = st.byDate[dates[dates.length - 1]];
      const delta = lastW - first;
      const dtxt = delta === 0 ? 'flat' : `${delta > 0 ? '+' : ''}${fmtNum(delta)} ${unit()}`;
      progChart = `${picker}<div class="faint" style="font-size:12px;margin:8px 0 2px">Top-set weight · ${dates.length} sessions · <span class="${delta >= 0 ? 'green' : 'faint'}">${dtxt}</span></div>${svgLine(points, 'var(--gold)')}`;
    } else {
      progChart = `${picker}<p class="muted" style="margin-top:10px">Log this lift on at least two different days in this range to see a trend.</p>`;
    }
  }

  // ---- Habit grid (range weeks × split days)
  const days = state.split;
  let habit = '';
  if (days.length) {
    const header = days.map((d) => `<th>${d.weekday != null ? WEEKDAYS[d.weekday] : esc(d.name.slice(0, 6))}</th>`).join('');
    const rows = weeks.map((w) => {
      const cells = days.map((d) => {
        if (d.weekday == null) return `<td><div class="hcell rest"></div></td>`;
        const offset = d.weekday === 0 ? 6 : d.weekday - 1;
        const cellDate = dateToStr(addDays(w.start, offset));
        const logged = sessionDates.has(cellDate);
        const future = cellDate > todayStr();
        return `<td><div class="hcell ${logged ? 'on' : future ? 'rest' : ''}" title="${cellDate}"></div></td>`;
      }).join('');
      return `<tr><td class="wk">${w.label}</td>${cells}</tr>`;
    }).join('');
    habit = `<div class="grid-scroll"><table class="habit"><thead><tr><th></th>${header}</tr></thead><tbody>${rows}</tbody></table></div>`;
  } else {
    habit = `<p class="muted">Add training days in the Split tab to see your weekly habit grid.</p>`;
  }

  // ---- Personal bests (all-time)
  const byEx = {};
  completed.filter((l) => l.weight > 0 && l.reps > 0).forEach((l) => { (byEx[l.exercise] = byEx[l.exercise] || []).push(l); });
  const pbRows = Object.keys(byEx).sort((a, b) => a.localeCompare(b)).map((n) => {
    const arr = byEx[n];
    let heavy = arr[0], best = arr[0];
    arr.forEach((l) => {
      if (l.weight > heavy.weight || (l.weight === heavy.weight && l.reps > heavy.reps)) heavy = l;
      if (l.weight * l.reps > best.weight * best.reps) best = l;
    });
    return `<div class="pb-row"><div class="pb-ex">${esc(n)}</div>
      <div class="pb-vals">
        <div>Heaviest <b>${fmtNum(heavy.weight)} ${unit()}</b> <span class="pb-date">${fmtShort(heavy.date)}</span></div>
        <div>Best set <b>${fmtNum(best.weight)} × ${best.reps}</b> <span class="pb-date">${fmtShort(best.date)}</span></div>
      </div></div>`;
  }).join('');

  return `
    <h1 class="view-title">Progress</h1>
    <div class="range-chips">${chips}</div>
    <div class="stat-grid stat-4">
      <div class="stat"><div class="v">${sessionDates.size}</div><div class="l">Sessions</div></div>
      <div class="stat"><div class="v">${rSets}</div><div class="l">Sets</div></div>
      <div class="stat"><div class="v">${setsPerWk}</div><div class="l">Sets / wk</div></div>
      <div class="stat"><div class="v">${fmtNum(Math.round(rVol))}</div><div class="l">Vol ${unit()}</div></div>
    </div>

    <h2 class="section">Sets per muscle · per week</h2>
    <div class="card">
      ${svgStackedBars(weeks, buckets)}
      ${legendHtml(buckets)}
    </div>

    <h2 class="section">Muscle balance · ${rangeLabel}</h2>
    <div class="card">${balItems.length ? hBarsHtml(balItems, rSets) : '<p class="muted">No sets in this range.</p>'}</div>

    <h2 class="section">Weekly volume ${trend}</h2>
    <div class="card">${svgVBars(weeks, 'var(--gold)')}
      <div class="faint" style="font-size:11px;text-align:right;margin-top:2px">this week ${fmtNum(Math.round(lastV))} ${unit()}</div>
    </div>

    ${exNames.length ? `<h2 class="section">Strength progression</h2><div class="card">${progChart}</div>` : ''}

    <h2 class="section">Weekly consistency</h2>
    <div class="card">${habit}</div>

    <h2 class="section">Personal bests</h2>
    <div class="card">${pbRows || '<p class="muted">Log some weighted sets to start tracking PRs.</p>'}</div>
  `;
}

/* ---- Split editor -------------------------------------------------------- */
function splitView() {
  if (state.split.length === 0) {
    return `<h1 class="view-title">Split</h1>` + `<div class="empty">
      <div class="big">🗓️</div>
      <h3>Build your split</h3>
      <p>Create your training days from scratch — name each day, tag muscle groups, and set target sets & reps for every exercise.</p>
      <button class="btn gold block" data-act="split:addday">+ Add your first day</button>
      <button class="subtle-link" data-act="split:loadstarter" style="margin-top:14px">or load the Iron Log starter split</button>
    </div>`;
  }
  const days = state.split.map((d, di) => {
    const wdSel = `<select data-act="split:weekday" data-day="${d.id}" aria-label="Weekday">
      <option value="">No weekday</option>
      ${WEEKDAYS.map((w, i) => `<option value="${i}" ${d.weekday === i ? 'selected' : ''}>${WEEKDAYS_LONG[i]}</option>`).join('')}
    </select>`;
    const exs = d.exercises.map((e, ei) => `
      <div class="ex-edit">
        <div class="reorder">
          <button class="btn sm icon" data-act="split:moveex" data-day="${d.id}" data-ex="${e.id}" data-dir="-1" ${ei === 0 ? 'disabled' : ''} aria-label="Move up">▲</button>
          <button class="btn sm icon" data-act="split:moveex" data-day="${d.id}" data-ex="${e.id}" data-dir="1" ${ei === d.exercises.length - 1 ? 'disabled' : ''} aria-label="Move down">▼</button>
        </div>
        <div class="ex-edit-main" data-act="split:editex" data-day="${d.id}" data-ex="${e.id}">
          <div class="n">${esc(e.name)}</div>
          <div class="m"><span class="pill muscle">${esc(e.muscle)}</span> &nbsp;${e.sets} × ${esc(e.reps || '—')}</div>
        </div>
        <button class="btn sm ghost" data-act="split:editex" data-day="${d.id}" data-ex="${e.id}">Edit</button>
      </div>`).join('');
    return `<details class="split-day" ${di === 0 ? 'open' : ''}>
      <summary>
        <span class="caret">▶</span>
        <span class="d-name">${esc(d.name)}</span>
        <span class="d-meta">${d.weekday != null ? WEEKDAYS[d.weekday] + ' · ' : ''}${d.exercises.length} ex</span>
      </summary>
      <div class="split-body">
        <label class="field"><span>Day name</span>
          <input type="text" value="${esc(d.name)}" data-act="split:dayname" data-day="${d.id}" /></label>
        <label class="field"><span>Weekday (for auto-select on Today)</span>${wdSel}</label>
        <div class="btn-row" style="margin-bottom:10px">
          <button class="btn sm" data-act="split:moveday" data-day="${d.id}" data-dir="-1" ${di === 0 ? 'disabled' : ''}>▲ Up</button>
          <button class="btn sm" data-act="split:moveday" data-day="${d.id}" data-dir="1" ${di === state.split.length - 1 ? 'disabled' : ''}>▼ Down</button>
          <button class="btn sm danger" data-act="split:delday" data-day="${d.id}">Delete day</button>
        </div>
        <h2 class="section" style="margin-top:10px">Exercises</h2>
        ${exs || '<p class="muted" style="margin:6px 0">No exercises yet.</p>'}
        <button class="btn ghost block" data-act="split:addex" data-day="${d.id}" style="margin-top:10px">+ Add exercise</button>
      </div>
    </details>`;
  }).join('');
  return `<h1 class="view-title">Split</h1>${days}
    <button class="btn gold block" data-act="split:addday" style="margin-top:4px">+ Add training day</button>`;
}

/* ---- Shared bits --------------------------------------------------------- */
function emptyState(emoji, title, text, btnLabel, act) {
  return `<div class="empty">
    <div class="big">${emoji}</div>
    <h3>${esc(title)}</h3>
    <p>${esc(text)}</p>
    ${btnLabel ? `<button class="btn gold" data-act="${act}">${esc(btnLabel)}</button>` : ''}
  </div>`;
}

/* --------------------------------------------------------------------------
   Cloud: auth screen, account, and the People (community) tab
   -------------------------------------------------------------------------- */
function renderAuth() {
  const create = state.authCreate;
  root.innerHTML = `<div id="app"><div class="onboard">
    <div class="logo"><img src="./icons/icon-512.png" alt="Iron Log" /></div>
    <h1>Iron<b>Log</b></h1>
    <p class="tag">${create ? 'Create your account' : 'Welcome back'}</p>
    ${state.authErr ? `<div class="auth-err">${esc(state.authErr)}</div>` : ''}
    <label class="field"><span>Username</span>
      <input type="text" id="au-user" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="username" placeholder="e.g. garrett" /></label>
    <label class="field"><span>Password</span>
      <input type="password" id="au-pass" autocomplete="${create ? 'new-password' : 'current-password'}" placeholder="at least 6 characters" /></label>
    ${create ? `
      <label class="field"><span>Display name (optional)</span><input type="text" id="au-name" placeholder="Shown to others" /></label>
      <label class="field"><span>Units</span><select id="au-unit"><option value="lb">lb</option><option value="kg">kg</option></select></label>
      <label class="row-check"><input type="checkbox" id="au-seed" checked /> <span>Start with the Iron Log starter split</span></label>
    ` : ''}
    <button class="btn gold block" data-act="auth:submit" style="margin-top:6px">${create ? 'Create account' : 'Sign in'}</button>
    <button class="subtle-link" data-act="auth:toggle" style="margin-top:14px;display:block;width:100%">${create ? 'Have an account? Sign in' : 'New here? Create an account'}</button>
    ${create ? '<p class="faint" style="font-size:11px;text-align:center;margin-top:16px">Your workouts are public to other Iron Log members. You can switch to private anytime in account settings.</p>' : ''}
  </div></div>`;
  const u = document.getElementById('au-user'); if (u) u.focus();
  ['au-user', 'au-pass', 'au-name'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') authSubmit(); });
  });
}

async function authSubmit() {
  const username = ((document.getElementById('au-user') || {}).value || '').trim();
  const password = (document.getElementById('au-pass') || {}).value || '';
  state.authErr = null;
  if (!/^[a-zA-Z0-9_.]{2,20}$/.test(username)) { state.authErr = 'Username: 2–20 letters, numbers, _ or .'; renderAuth(); return; }
  if (password.length < 6) { state.authErr = 'Password must be at least 6 characters.'; renderAuth(); return; }
  const btn = document.querySelector('[data-act="auth:submit"]'); if (btn) { btn.textContent = 'Please wait…'; btn.disabled = true; }
  try {
    if (state.authCreate) {
      const displayName = ((document.getElementById('au-name') || {}).value || '').trim() || username;
      const unitSel = (document.getElementById('au-unit') || {}).value || 'lb';
      const seed = (document.getElementById('au-seed') || {}).checked;
      await Cloud.signUp({ username, password, displayName, unit: unitSel, days: seed ? STARTER_SPLIT() : [] });
    } else {
      await Cloud.signIn({ username, password });
    }
    await enterCloudUser();
    state.tab = 'today'; state.selectedDate = todayStr(); state.selectedDayId = null; state.authErr = null;
    render();
  } catch (e) { state.authErr = e.message || 'Something went wrong.'; renderAuth(); }
}

// Load the signed-in user's data from the cloud into state (with an offline
// fallback to the local IndexedDB cache).
async function enterCloudUser() {
  const uid = Cloud.user().id;
  state.mode = 'cloud'; state.profileId = uid;
  let pulled = null;
  try { pulled = await Cloud.pullMine(); } catch (e) { /* offline */ }
  if (pulled && pulled.profile) {
    const pr = pulled.profile;
    state.profile = { id: uid, name: pr.display_name || pr.username, username: pr.username, unit: pr.unit || 'lb', is_public: pr.is_public !== false };
    state.split = pulled.days || [];
    state.logs = (pulled.logs || []).map((l) => ({ ...l, profileId: uid, updatedAt: Date.now() }));
    await cacheMine();
  } else {
    await loadProfiles(); await loadProfileData(uid);
    if (!state.profile) state.profile = { id: uid, name: 'Me', unit: 'lb', username: '' };
  }
  localStorage.setItem(CUR_KEY, uid);
  try { state.follows = await Cloud.myFollows(); } catch (e) { state.follows = new Set(); }
  syncStats();
}

// Overwrite the local offline snapshot with current cloud state.
async function cacheMine() {
  const uid = state.profileId;
  await DB.put('profiles', state.profile);
  await DB.put('splits', { profileId: uid, days: state.split });
  const existing = await DB.logsByProfile(uid);
  for (const l of existing) await DB.del('logs', l.id);
  for (const l of state.logs) await DB.put('logs', l);
}

async function loadPeople() {
  state.people = null; state.peopleErr = null; render();
  try {
    state.people = await Cloud.listUsers();
    patchMyRow(); // show my live numbers immediately, even before they sync up
  } catch (e) { state.peopleErr = e.message; }
  render();
}

// Overlay my own row in the people list with current local data so I always
// see myself accurately (the synced copy can lag a second behind).
function patchMyRow() {
  if (!state.people || !state.profile) return;
  const sum = computeSummary();
  const meRow = {
    id: state.profileId, username: state.profile.username || '', display_name: state.profile.name,
    unit: state.profile.unit || 'lb', is_public: state.profile.is_public !== false,
    stats: sum.stats, top_lifts: sum.top_lifts, lifts: sum.lifts,
  };
  const i = state.people.findIndex((u) => u.id === state.profileId);
  if (i >= 0) state.people[i] = meRow; else if (meRow.is_public) state.people.unshift(meRow);
}
async function loadUser(id) {
  state.viewUserId = id; state.viewUser = null; state.viewFollow = null; render();
  try {
    const [u, fi] = await Promise.all([Cloud.getUser(id), Cloud.followInfo(id)]);
    state.viewUser = u || 'private'; state.viewFollow = fi;
  } catch (e) { state.viewUser = 'private'; }
  render();
}

function peopleView() {
  if (state.viewUserId) return userDetailView();
  const filter = state.peopleFilter;
  const seg = `<div class="seg">
    <button class="${filter === 'discover' ? 'on' : ''}" data-act="people:filter" data-f="discover">Discover</button>
    <button class="${filter === 'following' ? 'on' : ''}" data-act="people:filter" data-f="following">Following</button>
  </div>`;
  let list = state.people;
  if (list && filter === 'following') {
    const f = state.follows || new Set();
    list = list.filter((p) => f.has(p.id));
  }
  return `
    <div class="people-head"><h1 class="view-title" style="margin:2px">People</h1>
      <button class="btn sm ghost" data-act="people:refresh">↻</button></div>
    ${seg}
    ${state.peopleErr ? `<div class="card"><p class="muted">Couldn't load people: ${esc(state.peopleErr)}</p></div>`
      : state.people === null ? '<div class="card"><p class="muted">Loading…</p></div>'
      : list.length === 0 ? emptyState(filter === 'following' ? '➕' : '👥',
          filter === 'following' ? 'Not following anyone yet' : 'No one here yet',
          filter === 'following' ? 'Open someone from Discover and tap Follow to build your circle.' : 'Friends who add Iron Log and create an account will show up here.', '')
      : `<div class="people-list">${list.map(userCard).join('')}</div>`}
  `;
}

function userCard(p) {
  const s = p.stats || {};
  const me = state.profileId === p.id;
  const following = state.follows && state.follows.has(p.id);
  const top = (p.top_lifts || []).slice(0, 3).map((t) => `${esc(t.exercise.split(' ').slice(0, 2).join(' '))} ${fmtNum(t.weight)}`).join(' · ');
  const tag = me ? '<span class="pill muscle">you</span>' : following ? '<span class="pill follow">following</span>' : '';
  return `<button class="user-card" data-act="people:view" data-id="${p.id}">
    <div class="ava">${esc((p.display_name || p.username || '?').slice(0, 1).toUpperCase())}</div>
    <div class="uc-main">
      <div class="uc-name">${esc(p.display_name || p.username)}${tag ? ' ' + tag : ''}</div>
      <div class="uc-sub">@${esc(p.username)} · ${s.sessions || 0} sessions · ${s.sets || 0} sets</div>
      ${top ? `<div class="uc-top">${top} ${esc(p.unit || 'lb')}</div>` : ''}
    </div>
    <span class="chev">›</span>
  </button>`;
}

function userDetailView() {
  const u = state.viewUser;
  const back = `<button class="btn sm ghost" data-act="people:back">‹ People</button>`;
  if (!u) return `<div class="people-head">${back}</div><div class="card"><p class="muted">Loading…</p></div>`;
  if (u === 'private') return `<div class="people-head">${back}</div>` + emptyState('🔒', 'Private profile', 'This member keeps their workouts private.', '');
  const p = u.profile, unitL = p.unit || 'lb', logs = u.logs || [];
  const me = p.id === state.profileId;
  const completed = logs.filter(isCompleted);
  const sessions = new Set(completed.map((l) => l.date)).size;
  const vol = Math.round(completed.reduce((a, l) => a + (l.weight || 0) * (l.reps || 0), 0));
  const fi = state.viewFollow || { followers: 0, following: 0, followsMe: false };
  const following = state.follows && state.follows.has(p.id);
  const badge = fi.followsMe ? (following ? '<span class="pill follow">friends</span>' : '<span class="pill">follows you</span>') : '';
  const followBtn = me ? '' : `<button class="btn ${following ? '' : 'gold'} sm" data-act="user:follow" data-id="${p.id}">${following ? 'Following ✓' : '+ Follow'}</button>`;
  return `
    <div class="people-head">${back}</div>
    <div class="profile-hero">
      <div class="ava lg">${esc((p.display_name || p.username || '?').slice(0, 1).toUpperCase())}</div>
      <div style="flex:1">
        <div class="ph-name">${esc(p.display_name || p.username)} ${badge}</div>
        <div class="ph-sub">@${esc(p.username)}</div>
        <div class="ph-follow"><b>${fi.followers}</b> followers · <b>${fi.following}</b> following</div>
      </div>
      ${followBtn}
    </div>
    <div class="stat-grid stat-4">
      <div class="stat"><div class="v">${sessions}</div><div class="l">Sessions</div></div>
      <div class="stat"><div class="v">${completed.length}</div><div class="l">Sets</div></div>
      <div class="stat"><div class="v">${fmtNum(vol)}</div><div class="l">Vol ${unitL}</div></div>
      <div class="stat"><div class="v">${(u.days || []).length}</div><div class="l">Days</div></div>
    </div>
    <h2 class="section">Their split</h2>
    ${readonlySplitHtml(u.days || [])}
    <h2 class="section">Best lifts</h2>
    <div class="card">${pbListHtml(logs, unitL) || '<p class="muted">No weighted sets logged yet.</p>'}</div>
  `;
}

/* ---- Ranks (leaderboards) ------------------------------------------------ */
function ranksView() {
  if (state.peopleErr) return `<h1 class="view-title">Ranks</h1><div class="card"><p class="muted">Couldn't load: ${esc(state.peopleErr)}</p></div>`;
  if (state.people === null) return `<h1 class="view-title">Ranks</h1><div class="card"><p class="muted">Loading…</p></div>`;

  const scope = state.ranksScope, metric = state.ranksMetric;
  let users = state.people.slice();
  if (scope === 'following') {
    const f = state.follows || new Set();
    users = users.filter((u) => f.has(u.id) || u.id === state.profileId);
  }

  const scopeSeg = `<div class="seg">
    <button class="${scope === 'all' ? 'on' : ''}" data-act="ranks:scope" data-s="all">Everyone</button>
    <button class="${scope === 'following' ? 'on' : ''}" data-act="ranks:scope" data-s="following">You + Following</button>
  </div>`;
  const metricChips = [['lift', 'Top lift'], ['volume', 'Volume'], ['sessions', 'Sessions'], ['sets', 'Sets']]
    .map(([m, label]) => `<button class="chip ${metric === m ? 'on' : ''}" data-act="ranks:metric" data-m="${m}">${label}</button>`).join('');

  let rows = [], valFmt, liftPicker = '';
  if (metric === 'lift') {
    // gather available lifts across the visible users
    const counts = {};
    users.forEach((u) => Object.keys(u.lifts || {}).forEach((ex) => { counts[ex] = (counts[ex] || 0) + 1; }));
    const lifts = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
    if (lifts.length && (!state.ranksLift || !counts[state.ranksLift])) state.ranksLift = lifts[0];
    if (!lifts.length) {
      return `<h1 class="view-title">Ranks</h1>${scopeSeg}<div class="chip-row">${metricChips}</div>` +
        emptyState('🏋️', 'No lifts logged yet', 'Once people log some weighted sets, the per-lift leaderboard fills in.', '');
    }
    liftPicker = `<select class="prog-select" data-act="ranks:lift" style="margin-bottom:12px">${lifts.map((l) => `<option ${l === state.ranksLift ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    const lift = state.ranksLift;
    rows = users.filter((u) => u.lifts && u.lifts[lift]).map((u) => ({ u, v: u.lifts[lift].e1rm, sub: `${fmtNum(u.lifts[lift].weight)}×${u.lifts[lift].reps}` }));
    valFmt = (r) => `${fmtNum(r.v)} <span class="rk-unit">est ${esc(r.u.unit || 'lb')}</span>`;
  } else {
    rows = users.map((u) => ({ u, v: (u.stats && u.stats[metric]) || 0 })).filter((r) => r.v > 0);
    const label = metric === 'volume' ? 'vol' : metric;
    valFmt = (r) => `${fmtNum(r.v)} <span class="rk-unit">${metric === 'volume' ? esc(r.u.unit || 'lb') : label}</span>`;
  }
  rows.sort((a, b) => b.v - a.v);

  const medals = ['🥇', '🥈', '🥉'];
  const list = rows.length ? rows.map((r, i) => {
    const me = r.u.id === state.profileId;
    return `<button class="rank-row ${me ? 'me' : ''}" data-act="people:view" data-id="${r.u.id}">
      <div class="rk-pos ${i < 3 ? 'medal' : ''}">${i < 3 ? medals[i] : i + 1}</div>
      <div class="ava sm">${esc((r.u.display_name || r.u.username || '?').slice(0, 1).toUpperCase())}</div>
      <div class="rk-main"><div class="rk-name">${esc(r.u.display_name || r.u.username)}${me ? ' <span class="pill muscle">you</span>' : ''}</div>
        ${r.sub ? `<div class="rk-sub">${r.sub}</div>` : ''}</div>
      <div class="rk-val">${valFmt(r)}</div>
    </button>`;
  }).join('') : '<div class="card"><p class="muted">No one to rank here yet.</p></div>';

  return `
    <h1 class="view-title">Ranks</h1>
    ${scopeSeg}
    <div class="chip-row">${metricChips}</div>
    ${liftPicker}
    <div class="rank-list">${list}</div>
  `;
}

function readonlySplitHtml(days) {
  if (!days || !days.length) return '<div class="card"><p class="muted">No split set up.</p></div>';
  return days.map((d) => `<div class="card ro-day">
    <div class="ro-day-head"><b>${esc(d.name)}</b>${d.weekday != null ? `<span class="faint">${WEEKDAYS[d.weekday]}</span>` : ''}</div>
    ${(d.exercises || []).map((e) => `<div class="ro-ex"><span>${esc(e.name)}</span><span class="faint">${e.sets}×${esc(e.reps || '—')}</span></div>`).join('')}
  </div>`).join('');
}

function pbListHtml(logs, unitL) {
  const byEx = {};
  logs.filter((l) => isCompleted(l) && l.weight > 0 && l.reps > 0).forEach((l) => { (byEx[l.exercise] = byEx[l.exercise] || []).push(l); });
  const names = Object.keys(byEx).sort((a, b) => a.localeCompare(b));
  if (!names.length) return '';
  return names.map((n) => {
    const arr = byEx[n]; let heavy = arr[0], best = arr[0];
    arr.forEach((l) => { if (l.weight > heavy.weight || (l.weight === heavy.weight && l.reps > heavy.reps)) heavy = l; if (l.weight * l.reps > best.weight * best.reps) best = l; });
    return `<div class="pb-row"><div class="pb-ex">${esc(n)}</div>
      <div class="pb-vals">
        <div>Heaviest <b>${fmtNum(heavy.weight)} ${unitL}</b> <span class="pb-date">${fmtShort(heavy.date)}</span></div>
        <div>Best set <b>${fmtNum(best.weight)} × ${best.reps}</b> <span class="pb-date">${fmtShort(best.date)}</span></div>
      </div></div>`;
  }).join('');
}

function openAccountSheet() {
  const p = state.profile, u = unit();
  openSheet(`
    <h3>${esc(p.name)}</h3>
    <p class="muted" style="margin-top:-8px">@${esc(p.username || '')}</p>
    <label class="field"><span>Display name</span><input type="text" id="ac-name" value="${esc(p.name)}" /></label>
    <label class="field"><span>Units</span></label>
    <div class="btn-row" style="margin:-6px 0 14px">
      <button class="btn sm ${u === 'lb' ? 'gold' : ''}" data-act="account:unit" data-unit="lb">lb</button>
      <button class="btn sm ${u === 'kg' ? 'gold' : ''}" data-act="account:unit" data-unit="kg">kg</button>
    </div>
    <label class="row-check"><input type="checkbox" id="ac-public" ${p.is_public !== false ? 'checked' : ''} /> <span>Public — others can find me in People</span></label>
    <div class="btn-row" style="margin:14px 0"><button class="btn sm" data-act="data:export">Export backup</button></div>
    <div class="sheet-actions"><button class="btn gold" data-act="account:save">Save</button></div>
    <div class="sheet-actions" style="margin-top:8px"><button class="btn danger" data-act="account:signout">Sign out</button></div>
    <div class="sheet-actions" style="margin-top:8px"><button class="btn ghost" data-act="sheet:close">Close</button></div>
  `);
}

/* --------------------------------------------------------------------------
   Onboarding (first run)
   -------------------------------------------------------------------------- */
function renderOnboard() {
  const step = state.onboardName ? 2 : 1;
  root.innerHTML = `<div id="app"><div class="onboard">
    <div class="logo"><img src="./icons/icon-512.png" alt="Iron Log" /></div>
    <h1>Iron<b>Log</b></h1>
    <p class="tag">Your workout tracker. Data stays on this phone.</p>
    ${step === 1 ? `
      <div class="q">Who's training?</div>
      <input type="text" id="ob-name" placeholder="Your first name" autocomplete="off" />
      <button class="btn gold block" data-act="onboard:continue" style="margin-top:16px">Continue</button>
    ` : `
      <div class="q">Hey ${esc(state.onboardName)} — pick a starting point</div>
      <button class="btn gold block" data-act="onboard:starter" style="margin-bottom:12px">Use the Iron Log starter split</button>
      <button class="btn block" data-act="onboard:scratch">Start from scratch</button>
      <button class="subtle-link" data-act="onboard:back" style="margin-top:16px;display:block;width:100%">← back</button>
    `}
  </div></div>`;
  const inp = document.getElementById('ob-name');
  if (inp) { inp.focus(); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') onboardContinue(); }); }
}

function onboardContinue() {
  const inp = document.getElementById('ob-name');
  const name = (inp && inp.value.trim()) || '';
  if (!name) { inp && inp.focus(); return; }
  state.onboardName = name;
  renderOnboard();
}

/* --------------------------------------------------------------------------
   Modal / sheet + toast
   -------------------------------------------------------------------------- */
function openSheet(html) {
  document.getElementById('modal').innerHTML =
    `<div class="scrim" data-act="sheet:scrim"><div class="sheet" data-stop>${html}</div></div>`;
}
function closeSheet() { const m = document.getElementById('modal'); if (m) m.innerHTML = ''; }
let toastTimer = null;
function showToast(msg, isPB) {
  const old = document.querySelector('.toast'); if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'toast' + (isPB ? ' pb' : '');
  el.textContent = msg;
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2200);
}

/* ---- Chart tooltip (tap a bar/point to read its value) ------------------- */
let tipTimer = null;
function hideTip() { const el = document.getElementById('charttip'); if (el) el.remove(); }
function showTip(text, x, y) {
  hideTip();
  const el = document.createElement('div');
  el.id = 'charttip'; el.className = 'charttip'; el.textContent = text;
  document.body.appendChild(el);
  const w = el.offsetWidth, h = el.offsetHeight;
  let left = x - w / 2; left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
  let top = y - h - 12; if (top < 8) top = y + 16;
  el.style.left = left + 'px'; el.style.top = top + 'px';
  clearTimeout(tipTimer); tipTimer = setTimeout(hideTip, 2400);
}
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-tip]');
  if (el) showTip(el.getAttribute('data-tip'), e.clientX, e.clientY);
  else hideTip();
});

/* --------------------------------------------------------------------------
   Profile sheet
   -------------------------------------------------------------------------- */
function openProfileSheet() {
  const list = state.profiles.map((p) => `
    <button class="btn prof ${p.id === state.profileId ? 'current' : ''}" data-act="profile:select" data-id="${p.id}">
      <span>${esc(p.name)}${p.id === state.profileId ? ' ✓' : ''}</span>
      <span class="faint">${p.unit || 'lb'}</span>
    </button>`).join('');
  const u = unit();
  openSheet(`
    <h3>Profiles</h3>
    <div class="profile-list">${list}</div>
    <button class="btn block" data-act="profile:add" style="margin-bottom:16px">+ Add profile</button>
    <h2 class="section" style="margin-top:0">${esc(state.profile.name)} · settings</h2>
    <div class="btn-row" style="margin-bottom:10px">
      <button class="btn sm ${u === 'lb' ? 'gold' : ''}" data-act="profile:unit" data-unit="lb">lb</button>
      <button class="btn sm ${u === 'kg' ? 'gold' : ''}" data-act="profile:unit" data-unit="kg">kg</button>
      <button class="btn sm" data-act="profile:rename">Rename</button>
    </div>
    <div class="btn-row" style="margin-bottom:16px">
      <button class="btn sm" data-act="data:export">Export backup</button>
      <button class="btn sm" data-act="data:import">Import backup</button>
    </div>
    <button class="btn danger block" data-act="profile:delete">Delete this profile & data</button>
    <div class="sheet-actions" style="margin-top:14px"><button class="btn ghost" data-act="sheet:close">Close</button></div>
  `);
}

/* --------------------------------------------------------------------------
   Exercise editor sheet (split)
   -------------------------------------------------------------------------- */
function openExerciseSheet(dayId, exId) {
  const day = state.split.find((d) => d.id === dayId);
  const e = exId ? day.exercises.find((x) => x.id === exId) : { id: '', name: '', muscle: 'Chest', sets: 3, reps: '8-10' };
  openSheet(`
    <h3>${exId ? 'Edit exercise' : 'Add exercise'}</h3>
    <label class="field"><span>Name</span><input type="text" id="ex-name" value="${esc(e.name)}" placeholder="e.g. Barbell Bench Press" /></label>
    <label class="field"><span>Muscle group</span>
      <select id="ex-muscle">${MUSCLES.map((m) => `<option ${m === e.muscle ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
    <div class="btn-row">
      <label class="field" style="flex:1"><span>Target sets</span><input type="number" id="ex-sets" inputmode="numeric" min="1" max="20" value="${e.sets}" /></label>
      <label class="field" style="flex:1"><span>Target reps</span><input type="text" id="ex-reps" value="${esc(e.reps)}" placeholder="e.g. 8-10" /></label>
    </div>
    <div class="sheet-actions">
      ${exId ? `<button class="btn danger" data-act="split:delex" data-day="${dayId}" data-ex="${exId}">Delete</button>` : ''}
      <button class="btn gold" data-act="split:saveex" data-day="${dayId}" data-ex="${exId || ''}">Save</button>
    </div>
    <div class="sheet-actions" style="margin-top:8px"><button class="btn ghost" data-act="sheet:close">Cancel</button></div>
  `);
  const n = document.getElementById('ex-name'); if (n && !exId) n.focus();
}

/* --------------------------------------------------------------------------
   PB detection (fires a toast when a completed set beats prior bests)
   -------------------------------------------------------------------------- */
function checkPB(exName, rec) {
  if (!(rec.weight > 0 && rec.reps > 0)) return;
  const others = state.logs.filter((l) => l.exercise === exName && l.id !== rec.id && isCompleted(l) && l.weight > 0 && l.reps > 0);
  const maxW = others.reduce((m, l) => Math.max(m, l.weight), 0);
  const maxVol = others.reduce((m, l) => Math.max(m, l.weight * l.reps), 0);
  if (rec.weight > maxW) showToast(`🏆 New PB — ${fmtNum(rec.weight)} ${unit()}!`, true);
  else if (rec.weight * rec.reps > maxVol) showToast(`🏆 New best set — ${fmtNum(rec.weight)} × ${rec.reps}!`, true);
}

/* --------------------------------------------------------------------------
   Lightweight Today updates (avoid full re-render while inputs are focused)
   -------------------------------------------------------------------------- */
function updateExerciseBadge(exName) {
  const date = state.selectedDate;
  const done = setsFor(date, exName).filter(isCompleted).length;
  const badge = document.querySelector(`[data-prog="${cssEsc(exName)}"]`);
  if (!badge) return;
  // find target from the ex-target text is unreliable; recompute from split
  let target = 0;
  const day = state.split.find((d) => d.id === state.selectedDayId);
  const planned = day && day.exercises.find((e) => e.name === exName);
  if (planned) target = planned.sets;
  if (target > 0) { badge.textContent = `${done}/${target}`; badge.classList.toggle('done', done >= target); }
  else { badge.textContent = `${done} done`; badge.classList.toggle('done', done > 0); }
  updateDayBadge();
}
function updateDayBadge() {
  const date = state.selectedDate;
  const day = state.split.find((d) => d.id === state.selectedDayId);
  let done = 0, target = 0;
  if (day) day.exercises.forEach((e) => { done += setsFor(date, e.name).filter(isCompleted).length; target += e.sets; });
  // ad-hoc
  const plannedNames = new Set(day ? day.exercises.map((e) => e.name) : []);
  [...new Set(state.logs.filter((l) => l.date === date && !plannedNames.has(l.exercise)).map((l) => l.exercise))]
    .forEach((n) => { done += setsFor(date, n).filter(isCompleted).length; });
  const el = document.getElementById('day-prog');
  if (!el) return;
  const complete = target > 0 && done >= target;
  el.className = `day-progress ${complete ? 'complete' : ''}`;
  el.innerHTML = `Day: <b>${target > 0 ? `${done}/${target} sets` : `${done} sets`}</b>${complete ? ' ✓' : ''}`;
}
function cssEsc(s) { return (window.CSS && CSS.escape) ? CSS.escape(s) : s.replace(/["\\]/g, '\\$&'); }

/* --------------------------------------------------------------------------
   Event handling (delegated)
   -------------------------------------------------------------------------- */
let saveTimer = null;
document.addEventListener('input', (e) => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const act = t.dataset.act;
  if (act === 'today:input') {
    // Mutate the record in memory immediately so switching fields never drops a
    // value, then debounce only the IndexedDB write of that same record object.
    const rec = memSet(state.selectedDate, t.dataset.ex, t.dataset.muscle, parseInt(t.dataset.set, 10));
    if (t.dataset.kind === 'weight') rec.weight = num(t.value); else rec.reps = num(t.value);
    rec.updatedAt = Date.now();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { DB.put('logs', rec); Cloud.pushLog(rec); syncStats(); }, 250);
  } else if (act === 'split:dayname') {
    const d = state.split.find((x) => x.id === t.dataset.day);
    if (d) { d.name = t.value; saveSplit(); }
  }
});

document.addEventListener('change', (e) => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const act = t.dataset.act;
  if (act === 'today:date') { state.selectedDate = t.value; state.selectedDayId = autoDayForDate(t.value); render(); }
  else if (act === 'today:daychange') { state.selectedDayId = t.value; render(); }
  else if (act === 'prog:exercise') { state.progExercise = t.value; render(); }
  else if (act === 'ranks:lift') { state.ranksLift = t.value; render(); }
  else if (act === 'split:weekday') {
    const d = state.split.find((x) => x.id === t.dataset.day);
    if (d) { d.weekday = t.value === '' ? null : parseInt(t.value, 10); saveSplit().then(render); }
  }
});

document.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const a = t.dataset.act;
  const D = t.dataset;

  // navigation
  if (a.startsWith('nav:')) {
    state.tab = a.slice(4);
    if (state.tab === 'people') { state.viewUserId = null; state.viewUser = null; }
    if ((state.tab === 'people' || state.tab === 'ranks') && state.people === null) { loadPeople(); return; }
    render(); return;
  }

  // auth screen
  if (a === 'auth:submit') return authSubmit();
  if (a === 'auth:toggle') { state.authCreate = !state.authCreate; state.authErr = null; renderAuth(); return; }

  // People tab
  if (a === 'people:refresh') return loadPeople();
  if (a === 'people:view') return loadUser(D.id);
  if (a === 'people:back') { state.viewUserId = null; state.viewUser = null; render(); return; }
  if (a === 'people:filter') { state.peopleFilter = D.f; render(); return; }

  // Ranks tab
  if (a === 'ranks:scope') { state.ranksScope = D.s; render(); return; }
  if (a === 'ranks:metric') { state.ranksMetric = D.m; render(); return; }

  // follow / unfollow
  if (a === 'user:follow') {
    const id = D.id;
    if (!state.follows) state.follows = new Set();
    const was = state.follows.has(id);
    if (was) { state.follows.delete(id); if (state.viewFollow) state.viewFollow.followers = Math.max(0, state.viewFollow.followers - 1); }
    else { state.follows.add(id); if (state.viewFollow) state.viewFollow.followers += 1; }
    render();
    try { if (was) await Cloud.unfollow(id); else await Cloud.follow(id); }
    catch (e) { if (was) state.follows.add(id); else state.follows.delete(id); render(); }
    return;
  }

  // account (cloud)
  if (a === 'account:unit') { state.profile.unit = D.unit; await DB.put('profiles', state.profile); Cloud.pushProfile({ unit: D.unit }); openAccountSheet(); render(); return; }
  if (a === 'account:save') {
    const name = ((document.getElementById('ac-name') || {}).value || '').trim() || state.profile.name;
    const isPub = (document.getElementById('ac-public') || {}).checked;
    state.profile.name = name; state.profile.is_public = isPub;
    await DB.put('profiles', state.profile);
    Cloud.pushProfile({ display_name: name, is_public: isPub });
    closeSheet(); render(); return;
  }
  if (a === 'account:signout') {
    if (!confirm('Sign out of Iron Log on this device?')) return;
    await Cloud.signOut();
    state.profileId = null; state.profile = null; state.split = []; state.logs = [];
    state.people = null; state.viewUserId = null; state.viewUser = null; state.tab = 'today';
    state.authCreate = false; state.authErr = null; state.mode = 'cloud';
    localStorage.removeItem(CUR_KEY);
    closeSheet(); renderAuth(); return;
  }

  // progress range selector
  if (a === 'prog:range') { state.progRange = D.range === 'all' ? 'all' : parseInt(D.range, 10); render(); return; }

  // onboarding
  if (a === 'onboard:continue') return onboardContinue();
  if (a === 'onboard:back') { state.onboardName = ''; renderOnboard(); return; }
  if (a === 'onboard:starter' || a === 'onboard:scratch') {
    await createProfile(state.onboardName, a === 'onboard:starter');
    state.onboardName = ''; state.tab = 'today'; state.selectedDate = todayStr(); state.selectedDayId = null;
    render(); return;
  }

  // sheet
  if (a === 'sheet:close') return closeSheet();
  if (a === 'sheet:scrim') { if (e.target.classList.contains('scrim')) closeSheet(); return; }

  // profile
  if (a === 'profile:open') return state.mode === 'cloud' ? openAccountSheet() : openProfileSheet();
  if (a === 'profile:select') {
    if (D.id !== state.profileId) { await loadProfileData(D.id); state.tab = 'today'; state.selectedDayId = null; }
    closeSheet(); render(); return;
  }
  if (a === 'profile:add') { closeSheet(); state.profileId = null; state.onboardName = ''; renderOnboard(); return; }
  if (a === 'profile:unit') {
    state.profile.unit = D.unit; await DB.put('profiles', state.profile); await loadProfiles();
    openProfileSheet(); render(); return;
  }
  if (a === 'profile:rename') {
    const name = prompt('Profile name', state.profile.name);
    if (name && name.trim()) { state.profile.name = name.trim(); await DB.put('profiles', state.profile); await loadProfiles(); openProfileSheet(); render(); }
    return;
  }
  if (a === 'profile:delete') {
    if (!confirm(`Delete "${state.profile.name}" and all of its logged workouts? This can't be undone.`)) return;
    const pid = state.profileId;
    for (const l of state.logs) await DB.del('logs', l.id);
    await DB.del('splits', pid); await DB.del('profiles', pid);
    localStorage.removeItem(CUR_KEY);
    await loadProfiles();
    closeSheet();
    if (state.profiles.length) { await loadProfileData(state.profiles[0].id); render(); }
    else { state.profileId = null; renderOnboard(); }
    return;
  }
  if (a === 'data:export') return exportData();
  if (a === 'data:import') return importData();

  // today
  if (a === 'today:check') {
    const idx = parseInt(D.set, 10);
    const existing = state.logs.find((l) => l.date === state.selectedDate && l.exercise === D.ex && l.setIndex === idx);
    const rec = await upsertSet(state.selectedDate, D.ex, D.muscle, idx, { done: !(existing && existing.done) });
    // update just this row + counters
    const row = t.closest('.setrow');
    if (row) { row.classList.toggle('done', rec.done); t.classList.toggle('on', rec.done); }
    updateExerciseBadge(D.ex);
    if (rec.done) checkPB(D.ex, rec);
    return;
  }
  if (a === 'today:addset') {
    const date = state.selectedDate;
    const logs = setsFor(date, D.ex);
    const day = state.split.find((d) => d.id === state.selectedDayId);
    const planned = day && day.exercises.find((x) => x.name === D.ex);
    const target = planned ? planned.sets : 0;
    const nextIdx = Math.max(logs.length, target, logs.reduce((m, l) => Math.max(m, l.setIndex + 1), 0));
    await upsertSet(date, D.ex, D.muscle, nextIdx, {});
    // re-render just this exercise's rows
    const container = document.querySelector(`[data-setrows="${cssEsc(D.ex)}"]`);
    if (container) {
      const updated = setsFor(date, D.ex);
      const rows = Math.max(target, updated.reduce((m, l) => Math.max(m, l.setIndex + 1), 0));
      let html = '';
      for (let i = 0; i < rows; i++) { const l = updated.find((x) => x.setIndex === i) || {}; html += setRow(D.ex, D.muscle, i, l, i >= target); }
      container.innerHTML = html;
    } else render();
    return;
  }
  if (a === 'today:addex') return openAddAdhocSheet();
  if (a === 'adhoc:save') {
    const name = document.getElementById('ad-name').value.trim();
    const muscle = document.getElementById('ad-muscle').value;
    if (!name) { document.getElementById('ad-name').focus(); return; }
    await upsertSet(state.selectedDate, name, muscle, 0, {});
    closeSheet(); render(); return;
  }

  // split
  if (a === 'split:addday') {
    const used = state.split.map((d) => d.weekday).filter((w) => w != null);
    let wd = null; for (let i = 1; i <= 7; i++) { const c = i % 7; if (!used.includes(c)) { wd = c; break; } }
    state.split.push({ id: uid(), name: `Day ${state.split.length + 1}`, weekday: wd, exercises: [] });
    await saveSplit(); render(); return;
  }
  if (a === 'split:loadstarter') {
    state.split = STARTER_SPLIT(); await saveSplit(); render(); return;
  }
  if (a === 'split:delday') {
    const d = state.split.find((x) => x.id === D.day);
    if (!confirm(`Delete "${d ? d.name : 'this day'}"? Your logged history is kept.`)) return;
    state.split = state.split.filter((x) => x.id !== D.day); await saveSplit(); render(); return;
  }
  if (a === 'split:moveday') { moveInArray(state.split, (x) => x.id === D.day, parseInt(D.dir, 10)); await saveSplit(); render(); return; }
  if (a === 'split:addex' || a === 'split:editex') return openExerciseSheet(D.day, D.ex || null);
  if (a === 'split:saveex') {
    const day = state.split.find((d) => d.id === D.day);
    const name = document.getElementById('ex-name').value.trim();
    if (!name) { document.getElementById('ex-name').focus(); return; }
    const muscle = document.getElementById('ex-muscle').value;
    const sets = Math.max(1, parseInt(document.getElementById('ex-sets').value, 10) || 1);
    const reps = document.getElementById('ex-reps').value.trim();
    if (D.ex) { const ex2 = day.exercises.find((x) => x.id === D.ex); Object.assign(ex2, { name, muscle, sets, reps }); }
    else day.exercises.push({ id: uid(), name, muscle, sets, reps });
    await saveSplit(); closeSheet(); render(); return;
  }
  if (a === 'split:delex') {
    const day = state.split.find((d) => d.id === D.day);
    day.exercises = day.exercises.filter((x) => x.id !== D.ex);
    await saveSplit(); closeSheet(); render(); return;
  }
  if (a === 'split:moveex') {
    const day = state.split.find((d) => d.id === D.day);
    moveInArray(day.exercises, (x) => x.id === D.ex, parseInt(D.dir, 10));
    await saveSplit(); render(); return;
  }
});

function moveInArray(arr, pred, dir) {
  const i = arr.findIndex(pred); const j = i + dir;
  if (i < 0 || j < 0 || j >= arr.length) return;
  const [it] = arr.splice(i, 1); arr.splice(j, 0, it);
}

function openAddAdhocSheet() {
  openSheet(`
    <h3>Add exercise</h3>
    <p class="muted" style="margin-top:-6px">Logged for ${fmtShort(state.selectedDate)} only — it won't change your saved split.</p>
    <label class="field"><span>Name</span><input type="text" id="ad-name" placeholder="e.g. Face Pull" /></label>
    <label class="field"><span>Muscle group</span>
      <select id="ad-muscle">${MUSCLES.map((m) => `<option>${m}</option>`).join('')}</select></label>
    <div class="sheet-actions"><button class="btn gold" data-act="adhoc:save">Add</button></div>
    <div class="sheet-actions" style="margin-top:8px"><button class="btn ghost" data-act="sheet:close">Cancel</button></div>
  `);
  const n = document.getElementById('ad-name'); if (n) n.focus();
}

/* --------------------------------------------------------------------------
   Backup export / import (full device data as JSON file)
   -------------------------------------------------------------------------- */
async function exportData() {
  const profiles = await DB.getAll('profiles');
  const splits = await DB.getAll('splits');
  const logs = await DB.getAll('logs');
  const blob = new Blob([JSON.stringify({ app: 'iron-log', version: 1, exportedAt: new Date().toISOString(), profiles, splits, logs }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `iron-log-backup-${todayStr()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Backup downloaded');
}

function importData() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'application/json,.json';
  inp.onchange = async () => {
    const file = inp.files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || data.app !== 'iron-log') throw new Error('Not an Iron Log backup');
      if (!confirm('Import this backup? Matching profiles will be merged and existing entries updated.')) return;
      for (const p of (data.profiles || [])) await DB.put('profiles', p);
      for (const s of (data.splits || [])) await DB.put('splits', s);
      for (const l of (data.logs || [])) await DB.put('logs', l);
      await loadProfiles();
      const pid = state.profileId && state.profiles.find((p) => p.id === state.profileId) ? state.profileId : (state.profiles[0] && state.profiles[0].id);
      if (pid) await loadProfileData(pid);
      closeSheet(); render();
      showToast('Backup imported');
    } catch (err) { alert('Import failed: ' + err.message); }
  };
  inp.click();
}

/* --------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */
async function boot() {
  if (Cloud.enabled) {
    state.mode = 'cloud';
    try { await Cloud.init(); } catch (e) { /* ignore */ }
    if (Cloud.user()) { try { await enterCloudUser(); } catch (e) { /* offline */ } }
    render(); // renders auth screen when there is no session
  } else {
    await loadProfiles();
    const saved = localStorage.getItem(CUR_KEY);
    const pid = (saved && state.profiles.find((p) => p.id === saved)) ? saved : (state.profiles[0] && state.profiles[0].id);
    if (pid) await loadProfileData(pid);
    render();
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
}
boot().catch((err) => {
  root.innerHTML = `<div class="onboard"><h1>Iron<b>Log</b></h1><p class="tag">Couldn't start: ${esc(err.message)}</p></div>`;
});
