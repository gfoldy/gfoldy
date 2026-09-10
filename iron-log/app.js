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
   Movement library — pick from these so exercise names stay consistent, which
   is what makes the per-lift analytics and leaderboards line up. [name, muscle]
   -------------------------------------------------------------------------- */
const MOVEMENTS = [
  // Chest
  ['Barbell Bench Press', 'Chest'], ['Incline Barbell Bench Press', 'Chest'], ['Incline DB Press', 'Chest'],
  ['Flat DB Press', 'Chest'], ['Decline Bench Press', 'Chest'], ['Machine Chest Press', 'Chest'],
  ['Weighted Dips', 'Chest'], ['Push-Up', 'Chest'], ['Cable Fly', 'Chest'], ['Incline Cable Fly', 'Chest'],
  ['Low-to-High Cable Fly', 'Chest'], ['Pec Deck', 'Chest'], ['DB Fly', 'Chest'], ['Landmine Press', 'Chest'],
  // Back
  ['Deadlift', 'Back'], ['Rack Pull', 'Back'], ['Barbell Row', 'Back'], ['Pendlay Row', 'Back'], ['T-Bar Row', 'Back'],
  ['Seated Cable Row', 'Back'], ['Chest-Supported Row', 'Back'], ['Single-Arm DB Row', 'Back'],
  ['Wide-Grip Lat Pulldown', 'Back'], ['Close-Grip Lat Pulldown', 'Back'], ['Pull-Up', 'Back'], ['Chin-Up', 'Back'],
  ['Straight-Arm Pulldown', 'Back'], ['Cable Pullover', 'Back'], ['Machine Row', 'Back'], ['Meadows Row', 'Back'],
  ['Inverted Row', 'Back'],
  // Shoulders
  ['Overhead Press', 'Shoulders'], ['Seated DB Shoulder Press', 'Shoulders'], ['Arnold Press', 'Shoulders'],
  ['Machine Shoulder Press', 'Shoulders'], ['Cable Lateral Raise', 'Shoulders'], ['DB Lateral Raise', 'Shoulders'],
  ['Rear Delt Fly', 'Shoulders'], ['Reverse Pec Deck', 'Shoulders'], ['Face Pull', 'Shoulders'],
  ['Front Raise', 'Shoulders'], ['Upright Row', 'Shoulders'],
  // Biceps
  ['Barbell Curl', 'Biceps'], ['EZ-Bar Curl', 'Biceps'], ['DB Curl', 'Biceps'], ['Incline DB Curl', 'Biceps'],
  ['Hammer Curl', 'Biceps'], ['Cable Curl', 'Biceps'], ['Preacher Curl', 'Biceps'], ['Concentration Curl', 'Biceps'],
  ['Spider Curl', 'Biceps'],
  // Triceps
  ['Close-Grip Bench Press', 'Triceps'], ['Skull Crusher', 'Triceps'], ['Rope Pushdown', 'Triceps'],
  ['Straight-Bar Pushdown', 'Triceps'], ['Overhead DB Extension', 'Triceps'], ['Overhead Cable Extension', 'Triceps'],
  ['Triceps Dips', 'Triceps'], ['Triceps Kickback', 'Triceps'], ['JM Press', 'Triceps'],
  // Legs
  ['Back Squat', 'Legs'], ['Front Squat', 'Legs'], ['Hack Squat', 'Legs'], ['Leg Press', 'Legs'],
  ['Romanian Deadlift', 'Legs'], ['Stiff-Leg Deadlift', 'Legs'], ['Bulgarian Split Squat', 'Legs'],
  ['Walking Lunge', 'Legs'], ['Leg Extension', 'Legs'], ['Lying Leg Curl', 'Legs'], ['Seated Leg Curl', 'Legs'],
  ['Goblet Squat', 'Legs'], ['Belt Squat', 'Legs'], ['Step-Up', 'Legs'],
  // Glutes
  ['Hip Thrust', 'Glutes'], ['Glute Bridge', 'Glutes'], ['Cable Kickback', 'Glutes'], ['Sumo Deadlift', 'Glutes'],
  // Calves
  ['Standing Calf Raise', 'Calves'], ['Seated Calf Raise', 'Calves'], ['Leg Press Calf Raise', 'Calves'],
  // Core
  ['Hanging Leg Raise', 'Core'], ['Cable Crunch', 'Core'], ['Plank', 'Core'], ['Ab Wheel', 'Core'],
  ['Russian Twist', 'Core'], ['Decline Sit-Up', 'Core'],
  // Traps / Forearms
  ['Barbell Shrug', 'Traps'], ['DB Shrug', 'Traps'], ['Wrist Curl', 'Forearms'], ['Reverse Curl', 'Forearms'],
  ['Farmer Carry', 'Forearms'],
].map(([name, muscle]) => ({ name, muscle }));

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
      const req = indexedDB.open('ironlog', 3);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('profiles')) db.createObjectStore('profiles', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('splits')) db.createObjectStore('splits', { keyPath: 'profileId' });
        if (!db.objectStoreNames.contains('logs')) {
          const s = db.createObjectStore('logs', { keyPath: 'id' });
          s.createIndex('profileId', 'profileId', { unique: false });
        }
        if (!db.objectStoreNames.contains('meals')) {
          const s = db.createObjectStore('meals', { keyPath: 'id' });
          s.createIndex('profileId', 'profileId', { unique: false });
        }
        if (!db.objectStoreNames.contains('body')) {
          const s = db.createObjectStore('body', { keyPath: 'id' });
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
    mealsByProfile: (pid) => tx('meals', 'readonly', (s) => reqP(s.index('profileId').getAll(pid))),
    bodyByProfile: (pid) => tx('body', 'readonly', (s) => reqP(s.index('profileId').getAll(pid))),
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
  meals: [],            // nutrition entries for current profile (device-local)
  body: [],             // body weight + measurement entries (device-local)
  bodyMetric: 'weight', // selected metric for the Body chart
  tab: 'today',
  selectedDate: todayStr(),
  selectedDayId: null,  // which split day is shown on Today
  onboardName: '',
  progRange: 8,         // Progress tab: weeks shown (4/8/12/'all')
  progExercise: null,   // Progress tab: exercise selected for the strength chart
  mode: 'local',        // 'local' or 'cloud'
  people: null,         // People tab: cached user list
  peopleErr: null,
  peopleMode: 'feed',   // People tab: 'feed' | 'discover' | 'following'
  feed: null,           // People tab: cached activity feed
  feedErr: null,
  commentCounts: {},    // activityId -> comment count
  threadId: null,       // People tab: open comment thread (activity id)
  thread: null,         // the activity object for the open thread
  threadComments: null, // loaded comments for the open thread
  groupsMine: null,     // groups the user belongs to
  groupsPublic: null,   // public groups to discover
  groupCounts: {},      // groupId -> member count
  groupsErr: null,
  groupId: null,        // open group detail
  group: null,          // the open group row
  groupMembers: null,   // member rows of the open group
  groupProfiles: null,  // profile rows of members (for the board)
  groupFeed: null,      // activity from group members
  groupMessages: null,  // group chat messages
  groupTab: 'feed',     // group detail: 'feed' | 'board' | 'chat' | 'members'
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
  state.meals = await DB.mealsByProfile(pid);
  state.body = await DB.bodyByProfile(pid);
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
  const c = state.logs.filter(isWorking);
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

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
function relTime(iso) {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  if (s < 604800) return Math.floor(s / 86400) + 'd';
  return fmtShort(dateToStr(new Date(t)));
}

// Upsert one feed "session" row per training day, updated as sets are logged.
let sessTimer = null;
function syncSessionActivity(date) {
  if (!Cloud.enabled) return;
  clearTimeout(sessTimer);
  sessTimer = setTimeout(() => {
    const uid = state.profileId, id = 'sess_' + uid + '_' + date;
    const sets = state.logs.filter((l) => l.date === date && isWorking(l));
    if (!sets.length) { Cloud.deleteActivity(id); return; }
    const volume = Math.round(sets.reduce((a, l) => a + (l.weight || 0) * (l.reps || 0), 0));
    const muscles = [...new Set(sets.map((l) => muscleBucket(l.muscle)))];
    const wd = state.split.find((d) => d.weekday === weekdayOf(date));
    const dayName = wd ? wd.name : '';
    Cloud.pushActivity({ id, type: 'session', date, username: state.profile.username, display_name: state.profile.name,
      data: { sets: sets.length, volume, muscles, dayName, unit: unit() }, created_at: new Date().toISOString() });
    state.feed = null; // invalidate cached feed so it reloads with this event
  }, 900);
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
      muscle: muscle || 'Other', setIndex, weight: null, reps: null, done: false, type: 'work', rir: null };
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
  Cloud.pushLog(rec); syncStats(); syncSessionActivity(dateStr);
  return rec;
}

async function deleteSet(rec) {
  state.logs = state.logs.filter((l) => l.id !== rec.id);
  await DB.del('logs', rec.id);
  Cloud.deleteLog(rec.id); syncStats(); syncSessionActivity(rec.date);
}

function setsFor(dateStr, exName) {
  return state.logs.filter((l) => l.date === dateStr && l.exercise === exName)
    .sort((a, b) => a.setIndex - b.setIndex);
}
const isCompleted = (l) => !!l.done;
// A "working set" — what hypertrophy analytics count. Warm-ups are excluded.
const isWorking = (l) => !!l.done && l.type !== 'warmup';
const unit = () => (state.profile && state.profile.unit) || 'lb';

// Set types: [key, label, short badge]. 'work' is the default.
const SET_TYPES = [
  ['work', 'Working set', ''], ['warmup', 'Warm-up', 'WU'], ['drop', 'Drop set', 'DROP'],
  ['failure', 'To failure', 'F'], ['restpause', 'Rest-pause', 'RP'], ['myo', 'Myo-reps', 'MYO'],
];
const setTagShort = (l) => {
  const t = l.type && l.type !== 'work' ? (SET_TYPES.find((s) => s[0] === l.type) || [, , ''])[2] : '';
  if (t) return t;
  return l.rir != null && l.rir !== '' ? '@' + l.rir : '·';
};
let setTagPick = null; // in-sheet set-type selection

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
  // Group chat: keep the message list live while the Chat tab is open.
  if (state.tab === 'people' && state.groupId && state.groupTab === 'chat') {
    const el = document.getElementById('chat-list'); if (el) el.scrollTop = el.scrollHeight;
    startChatPoll();
  } else stopChatPoll();
}

let chatTimer = null;
function renderChatList() {
  const el = document.getElementById('chat-list'); if (!el) return;
  const msgs = state.groupMessages || [];
  el.innerHTML = msgs.length ? msgs.map(chatBubble).join('') : '<p class="muted" style="padding:10px 2px">No messages yet. Say hey 👋</p>';
  el.scrollTop = el.scrollHeight;
}
function startChatPoll() {
  if (chatTimer) return;
  chatTimer = setInterval(async () => {
    if (!(state.tab === 'people' && state.groupId && state.groupTab === 'chat')) { stopChatPoll(); return; }
    try {
      const msgs = await Cloud.groupMessages(state.groupId);
      const hasTemp = (state.groupMessages || []).some((m) => String(m.id).startsWith('tmp'));
      const lastId = msgs.length ? msgs[msgs.length - 1].id : null;
      const cur = state.groupMessages || [];
      const curLast = cur.length ? cur[cur.length - 1].id : null;
      if (!hasTemp && (lastId !== curLast || msgs.length !== cur.length)) { state.groupMessages = msgs; renderChatList(); }
    } catch (e) { /* keep trying */ }
  }, 4000);
}
function stopChatPoll() { if (chatTimer) { clearInterval(chatTimer); chatTimer = null; } }

// Invite links: ?join=<token> joins + opens that group after sign-in.
let pendingJoin = (() => { try { return new URLSearchParams(location.search).get('join'); } catch (e) { return null; } })();
if (pendingJoin) { try { history.replaceState({}, '', location.pathname); } catch (e) {} }
async function processPendingJoin() {
  if (!pendingJoin || !Cloud.enabled || !Cloud.user()) return false;
  const tok = pendingJoin; pendingJoin = null;
  try {
    const g = await Cloud.groupByCode(tok);
    if (g) {
      await Cloud.joinGroup({ groupId: g.id, username: state.profile.username, display_name: state.profile.name });
      state.tab = 'people'; state.peopleMode = 'groups';
      await loadGroups(); loadGroup(g.id); return true;
    }
  } catch (e) { /* ignore */ }
  return false;
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
    ${mesoBanner(date)}
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
    ${nutritionCard(date)}
  `;
}

/* ---- Nutrition (simple daily calorie + protein targets, device-local) ---- */
function getGoals() { try { return JSON.parse(localStorage.getItem('ironlog.goals.' + state.profileId)) || {}; } catch (e) { return {}; } }
function setGoals(cal, prot) { try { localStorage.setItem('ironlog.goals.' + state.profileId, JSON.stringify({ cal, prot })); } catch (e) {} }
function proteinOn(dateStr) { return state.meals.filter((m) => m.date === dateStr).reduce((a, m) => a + (m.protein || 0), 0); }

function nutritionCard(date) {
  const meals = state.meals.filter((m) => m.date === date).sort((a, b) => a.createdAt - b.createdAt);
  const kcal = meals.reduce((a, m) => a + (m.kcal || 0), 0);
  const prot = meals.reduce((a, m) => a + (m.protein || 0), 0);
  const g = getGoals(), calGoal = g.cal || 0, protGoal = g.prot || 0;
  const goalsSet = calGoal > 0 || protGoal > 0;
  const bar = (val, goal, cls) => {
    const pct = goal > 0 ? Math.min(100, Math.round((val / goal) * 100)) : 0;
    const over = goal > 0 && val > goal;
    return `<div class="nb"><div class="nb-fill ${over ? 'over' : cls}" style="width:${pct}%"></div></div>`;
  };
  // protein streak: consecutive days ending today that hit the protein goal
  let streak = 0;
  if (protGoal > 0) { let d = parseDate(date); while (proteinOn(dateToStr(d)) >= protGoal && streak <= 400) { streak++; d = addDays(d, -1); } }
  // 7-day protein sparkline
  const days = [];
  for (let i = 6; i >= 0; i--) { const ds = dateToStr(addDays(parseDate(date), -i)); days.push({ ds, p: proteinOn(ds) }); }
  const maxP = Math.max(protGoal || 0, ...days.map((d) => d.p), 1);
  const spark = days.map((d) => `<div class="np-bar ${protGoal && d.p >= protGoal ? 'hit' : ''}" style="height:${Math.max(3, (d.p / maxP) * 100)}%" data-tip="${d.ds}: ${fmtNum(d.p)}g protein"></div>`).join('');
  const list = meals.map((m) => `<div class="meal-row">
      <span class="meal-lbl">${esc(m.label || 'Entry')}</span>
      <span class="meal-macros">${m.kcal ? fmtNum(m.kcal) + ' kcal' : ''}${m.kcal && m.protein ? ' · ' : ''}${m.protein ? fmtNum(m.protein) + 'g P' : ''}</span>
      <button class="meal-x" data-act="nut:del" data-id="${m.id}" aria-label="Delete entry">✕</button>
    </div>`).join('');
  return `
    <h2 class="section">Nutrition${streak > 1 ? ` <span class="nstreak">🔥 ${streak}-day protein</span>` : ''}</h2>
    <div class="card">
      <div class="nrow"><div class="nlab">Calories <b>${fmtNum(kcal)}</b>${calGoal ? ` <span class="faint">/ ${fmtNum(calGoal)}</span>` : ''}</div>${calGoal ? bar(kcal, calGoal, 'cal') : ''}</div>
      <div class="nrow"><div class="nlab">Protein <b>${fmtNum(prot)}g</b>${protGoal ? ` <span class="faint">/ ${fmtNum(protGoal)}g</span>` : ''}</div>${protGoal ? bar(prot, protGoal, 'prot') : ''}</div>
      <div class="nadd">
        <input type="number" id="nut-kcal" inputmode="numeric" min="0" placeholder="kcal" />
        <input type="number" id="nut-protein" inputmode="numeric" min="0" placeholder="protein g" />
        <input type="text" id="nut-label" placeholder="label (optional)" />
        <button class="btn gold sm" data-act="nut:add">Add</button>
      </div>
      ${list ? `<div class="meal-list">${list}</div>` : ''}
      ${goalsSet ? `<div class="nspark">${spark}</div><div class="faint" style="font-size:11px;text-align:right;margin-top:2px">protein · last 7 days</div>` : ''}
      <button class="subtle-link" data-act="nut:goals">${goalsSet ? 'Edit daily goals' : 'Set daily calorie & protein goals'}</button>
    </div>`;
}

function openGoalSheet() {
  const g = getGoals();
  openSheet(`
    <h3>Daily goals</h3>
    <p class="muted" style="margin-top:-6px">Kept on this device.</p>
    <div class="btn-row">
      <label class="field" style="flex:1"><span>Calories</span><input type="number" id="g-cal" inputmode="numeric" value="${g.cal || ''}" placeholder="e.g. 2600" /></label>
      <label class="field" style="flex:1"><span>Protein (g)</span><input type="number" id="g-prot" inputmode="numeric" value="${g.prot || ''}" placeholder="e.g. 180" /></label>
    </div>
    <div class="sheet-actions"><button class="btn gold" data-act="nut:savegoals">Save goals</button></div>
    <div class="sheet-actions" style="margin-top:8px"><button class="btn ghost" data-act="sheet:close">Cancel</button></div>
  `);
}

/* ---- Body: weight + measurements (device-local) -------------------------- */
const BODY_METRICS = [
  { key: 'weight', label: 'Bodyweight', unit: () => unit() },
  { key: 'bodyfat', label: 'Body fat', unit: () => '%' },
  { key: 'chest', label: 'Chest', unit: () => 'in' },
  { key: 'shoulders', label: 'Shoulders', unit: () => 'in' },
  { key: 'arm', label: 'Arms', unit: () => 'in' },
  { key: 'waist', label: 'Waist', unit: () => 'in' },
  { key: 'thigh', label: 'Thighs', unit: () => 'in' },
  { key: 'calf', label: 'Calves', unit: () => 'in' },
];
const bodyMeta = (k) => BODY_METRICS.find((m) => m.key === k) || BODY_METRICS[0];
function bodyEntries(metric) {
  return state.body.filter((b) => b.metric === metric && b.value != null).sort((a, b) => (a.date < b.date ? -1 : 1));
}
function bodyLatest(metric) { const e = bodyEntries(metric); return e.length ? e[e.length - 1] : null; }

function bodyCard() {
  const metric = state.bodyMetric;
  const meta = bodyMeta(metric), u = meta.unit();
  const entries = bodyEntries(metric);
  const latest = entries.length ? entries[entries.length - 1] : null;
  const first = entries.length ? entries[0] : null;
  const delta = latest && first && entries.length > 1 ? latest.value - first.value : null;
  const picker = `<select class="prog-select" data-act="body:metric">${BODY_METRICS.map((m) => `<option value="${m.key}" ${m.key === metric ? 'selected' : ''}>${m.label}</option>`).join('')}</select>`;
  let chart;
  if (entries.length >= 2) {
    const pts = entries.slice(-16).map((e) => ({ label: fmtShort(e.date), y: e.value }));
    const dtxt = delta == null ? '' : `${delta > 0 ? '+' : ''}${fmtNum(Math.round(delta * 10) / 10)} ${u}`;
    const dcls = metric === 'weight' || metric === 'bodyfat' || metric === 'waist' ? (delta <= 0 ? 'green' : 'faint') : (delta >= 0 ? 'green' : 'faint');
    chart = `<div class="faint" style="font-size:12px;margin:2px 0 2px"><b class="gold">${fmtNum(latest.value)} ${u}</b> · latest${dtxt ? ` · <span class="${dcls}">${dtxt}</span>` : ''}</div>${svgLine(pts, 'var(--gold)')}`;
  } else if (latest) {
    chart = `<div class="faint" style="font-size:13px;margin-top:8px"><b class="gold">${fmtNum(latest.value)} ${u}</b> logged ${fmtShort(latest.date)}. Log again to see a trend.</div>`;
  } else {
    chart = `<p class="muted" style="margin-top:8px">No ${meta.label.toLowerCase()} entries yet.</p>`;
  }
  return `<h2 class="section">Body</h2>
    <div class="card">
      ${picker}
      <div style="margin-top:10px">${chart}</div>
      <button class="btn ghost block" data-act="body:log" style="margin-top:12px">+ Log measurements</button>
    </div>`;
}

function openBodySheet() {
  const today = todayStr();
  const fields = BODY_METRICS.map((m) => {
    const last = bodyLatest(m.key);
    const todayRec = state.body.find((b) => b.date === today && b.metric === m.key);
    const val = todayRec ? todayRec.value : '';
    return `<label class="field" style="flex:1 1 44%"><span>${m.label} (${m.unit()})</span>
      <input type="number" inputmode="decimal" step="0.1" id="body-${m.key}" value="${val}" placeholder="${last ? fmtNum(last.value) : ''}" /></label>`;
  }).join('');
  openSheet(`
    <h3>Log measurements</h3>
    <label class="field"><span>Date</span><input type="date" id="body-date" value="${today}" /></label>
    <div class="body-grid">${fields}</div>
    <p class="faint" style="font-size:12px">Leave any blank — only filled fields are saved. Placeholders show your last entry.</p>
    <div class="sheet-actions"><button class="btn gold" data-act="body:save">Save</button></div>
    <div class="sheet-actions" style="margin-top:8px"><button class="btn ghost" data-act="sheet:close">Cancel</button></div>
  `);
}

/* ---- Exercise history + auto progression -------------------------------- */
function parseRepRange(reps) {
  const m = String(reps || '').match(/(\d+)\s*(?:[-–]\s*(\d+))?/);
  if (!m) return null;
  const low = parseInt(m[1], 10);
  return { low, high: m[2] ? parseInt(m[2], 10) : low };
}
const roundHalf = (w) => Math.round(w * 2) / 2;

// The most recent PRIOR session for an exercise (completed sets only).
function lastSession(exName, beforeDate) {
  const prior = state.logs.filter((l) => l.exercise === exName && l.date < beforeDate && isWorking(l) && (l.weight || l.reps));
  if (!prior.length) return null;
  const date = prior.reduce((m, l) => (l.date > m ? l.date : m), '0000-00-00');
  const sets = prior.filter((l) => l.date === date).sort((a, b) => a.setIndex - b.setIndex)
    .map((l) => ({ weight: l.weight || 0, reps: l.reps || 0 }));
  const top = sets.filter((s) => s.weight > 0 && s.reps > 0)
    .reduce((b, s) => (!b || e1rm(s.weight, s.reps) > e1rm(b.weight, b.reps) ? s : b), null);
  return { date, sets, top };
}

// Double-progression: hit the top of the rep range on your best set → add
// weight; otherwise keep the weight and chase reps.
function suggestNext(exName, reps, beforeDate) {
  const ls = lastSession(exName, beforeDate);
  if (!ls || !ls.top) return null;
  const rr = parseRepRange(reps);
  const inc = unit() === 'kg' ? 2.5 : 5;
  const W = ls.top.weight, R = ls.top.reps;
  if (W <= 0) return null;
  if (rr && R >= rr.high) return { weight: roundHalf(W + inc), hint: `${rr.low}–${rr.high} reps`, up: true };
  if (rr) return { weight: W, hint: `aim ${Math.min(R + 1, rr.high)}–${rr.high} reps`, up: false };
  return { weight: W, hint: `beat ${R} reps`, up: false };
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
  const ls = lastSession(name, date);
  const sug = suggestNext(name, reps, date);
  let meta = '';
  if (ls || sug) {
    const histLine = ls
      ? `Last · ${ls.sets.map((s) => `${fmtNum(s.weight)}×${s.reps}`).join(', ')} <span class="faint">${fmtShort(ls.date)}</span>`
      : '<span class="faint">First time — log your working weight</span>';
    const nextChip = sug
      ? `<button class="ex-next ${sug.up ? 'up' : ''}" data-act="today:prefill" data-ex="${esc(name)}" data-muscle="${esc(muscle)}" data-weight="${sug.weight}" title="${esc(sug.hint)}">${sug.up ? '▲ ' : ''}${fmtNum(sug.weight)} ${unit()}</button>`
      : '';
    meta = `<div class="ex-meta"><div class="ex-hist">${histLine}</div>${nextChip}</div>`;
  }
  const html = `
    <div class="exercise" data-exwrap="${esc(name)}">
      <div class="ex-head">
        <div><div class="ex-name">${esc(name)}</div><div class="ex-target">${targetLabel}</div></div>
        ${badge}
      </div>
      ${meta}
      <div class="setrows" data-setrows="${esc(name)}">${rowsHtml}</div>
      <button class="subtle-link" data-act="today:addset" data-ex="${esc(name)}" data-muscle="${esc(muscle)}">+ Add set</button>
    </div>`;
  return { html, done: doneCount, target: targetSets };
}

function setRow(name, muscle, i, l, extra) {
  const w = l.weight != null ? l.weight : '';
  const r = l.reps != null ? l.reps : '';
  const done = !!l.done;
  const tcls = l.type && l.type !== 'work' ? l.type : (l.rir != null && l.rir !== '' ? 'rir' : 'plain');
  return `<div class="setrow ${done ? 'done' : ''} ${extra ? 'extra' : ''} ${l.type === 'warmup' ? 'warm' : ''}" data-row="${esc(name)}:${i}">
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
    <button class="settag ${tcls}" data-act="today:settag" data-ex="${esc(name)}" data-muscle="${esc(muscle)}" data-set="${i}" aria-label="Set type / RIR">${setTagShort(l)}</button>
    <button class="check ${done ? 'on' : ''}" data-act="today:check" data-ex="${esc(name)}" data-muscle="${esc(muscle)}" data-set="${i}" aria-label="Mark set ${i + 1} done">${I.check}</button>
  </div>`;
}

function openSetTagSheet(ex, muscle, idx) {
  const rec = state.logs.find((x) => x.date === state.selectedDate && x.exercise === ex && x.setIndex === idx) || {};
  const cur = rec.type || 'work';
  const chips = SET_TYPES.map(([k, label]) => `<button class="chip ${k === cur ? 'on' : ''}" data-act="settag:type" data-t="${k}">${esc(label)}</button>`).join('');
  openSheet(`
    <h3>Set ${idx + 1} · ${esc(ex)}</h3>
    <h2 class="section" style="margin-top:0">Type</h2>
    <div class="chip-wrap" id="settag-chips">${chips}</div>
    <label class="field" style="margin-top:14px"><span>Reps in reserve (RIR) — optional</span>
      <input type="number" id="settag-rir" inputmode="numeric" min="0" max="10" value="${rec.rir != null ? rec.rir : ''}" placeholder="e.g. 2" /></label>
    <div class="sheet-actions"><button class="btn gold" data-act="settag:save" data-ex="${esc(ex)}" data-muscle="${esc(muscle)}" data-set="${idx}">Save</button></div>
    <div class="sheet-actions" style="margin-top:8px"><button class="btn ghost" data-act="sheet:close">Cancel</button></div>
  `);
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

// Weekly working-set volume landmarks per muscle [low, high] (sets/week).
// Below low = under-stimulus, low..high = productive zone, above high = high.
const MUSCLE_TARGETS = {
  Chest: [10, 20], Back: [10, 20], Shoulders: [8, 20], Legs: [12, 22],
  Biceps: [8, 16], Triceps: [8, 16], Calves: [8, 16], Glutes: [8, 16],
  Core: [6, 14], Traps: [6, 14], Forearms: [6, 14], Other: [8, 18],
};
const targetFor = (m) => MUSCLE_TARGETS[m] || [8, 18];
function volumeZone(sets, m) {
  const [lo, hi] = targetFor(m);
  return sets < lo ? 'under' : sets > hi ? 'high' : 'optimal';
}

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

// Current-week working sets per muscle vs the hypertrophy landmark band.
function weeklyTargetsHtml(week, buckets) {
  const zoneLabel = { under: 'below', optimal: 'in zone', high: 'high' };
  const rows = buckets.map((m) => {
    const sets = (week.byMuscle && week.byMuscle[m]) || 0;
    const [lo, hi] = targetFor(m);
    const zone = volumeZone(sets, m);
    const pct = Math.min(100, (sets / hi) * 100);
    return `<div class="hbar-row wt-${zone}" data-tip="${esc(m)} · ${sets} sets this week · target ${lo}–${hi} · ${zoneLabel[zone]}">
      <span class="hbar-l">${esc(m)}</span>
      <span class="hbar-track"><span class="wt-lo" style="left:${(lo / hi) * 100}%"></span><span class="hbar-fill wt-fill" style="width:${pct.toFixed(1)}%"></span></span>
      <span class="hbar-v">${sets}<span class="hbar-pct"> /${lo}–${hi}</span></span>
    </div>`;
  }).join('');
  return `<div class="hbars">${rows}</div>
    <div class="wt-legend"><span class="wt-key under">below</span><span class="wt-key optimal">in&nbsp;zone</span><span class="wt-key high">high</span><span class="faint">· target sets/week</span></div>`;
}

/* ---- Mesocycle / deload tracking (device-local) -------------------------- */
// A training block of hard weeks ending in a deload. Stored per profile:
// { start: "YYYY-MM-DD" (any day; snapped to its Monday), weeks: total incl. deload }.
const MESO_KEY = () => 'ironlog.meso.' + state.profileId;
function getMeso() { try { return JSON.parse(localStorage.getItem(MESO_KEY())) || null; } catch (e) { return null; } }
function setMeso(cfg) {
  try { if (cfg) localStorage.setItem(MESO_KEY(), JSON.stringify(cfg)); else localStorage.removeItem(MESO_KEY()); } catch (e) {}
}
// Where are we in the current block, relative to a date? null if not tracking.
function mesoStatus(dateStr) {
  const cfg = getMeso();
  if (!cfg || !cfg.start) return null;
  const weeks = Math.max(2, Math.min(12, cfg.weeks || 5));
  const startMon = mondayOf(parseDate(cfg.start));
  const curMon = mondayOf(parseDate(dateStr || todayStr()));
  const wIdx = Math.round((curMon.getTime() - startMon.getTime()) / (7 * 86400000)) + 1; // 1-based
  const done = wIdx > weeks;
  const before = wIdx < 1;
  const week = before ? 0 : done ? weeks : wIdx;
  const deloadDue = !done && !before && week === weeks;
  const phase = before ? 'Starts soon' : done ? 'Block complete' : deloadDue ? 'Deload' : 'Accumulation';
  return { start: cfg.start, weeks, week, deloadDue, done, before, phase, wIdx };
}

// Slim block banner for the Today tab (tap to edit). '' when not tracking.
function mesoBanner(dateStr) {
  const m = mesoStatus(dateStr);
  if (!m) return '';
  const cls = m.done || m.before ? 'idle' : m.deloadDue ? 'deload' : 'accum';
  const dots = Array.from({ length: m.weeks }, (_, i) => {
    const n = i + 1, de = n === m.weeks;
    const stateCls = m.done ? 'past' : n < m.week ? 'past' : n === m.week ? 'now' : '';
    return `<i class="mdot ${stateCls} ${de ? 'de' : ''}"></i>`;
  }).join('');
  const label = m.done ? 'Block complete — start a new one'
    : m.before ? `Block starts ${fmtShort(dateToStr(mondayOf(parseDate(m.start))))}`
    : `Week ${m.week} of ${m.weeks} · ${m.phase}`;
  const icon = m.deloadDue ? '🌀' : m.done ? '✅' : '🗓️';
  return `<div class="meso-banner ${cls}" data-act="meso:edit" role="button" tabindex="0">
    <span class="meso-line"><span class="meso-icon">${icon}</span><span class="meso-phase">${esc(label)}</span></span>
    <span class="mdots">${dots}</span>
  </div>`;
}

function mesoCard() {
  const m = mesoStatus(todayStr());
  if (!m) {
    return `<div class="card">
      <p class="muted" style="margin:2px 0 12px">Train in blocks: a run of hard weeks ending in a deload. Track which week you're in and get a nudge when it's time to back off.</p>
      <button class="btn gold block" data-act="meso:edit">Start a mesocycle</button>
    </div>`;
  }
  const dots = Array.from({ length: m.weeks }, (_, i) => {
    const n = i + 1, de = n === m.weeks;
    const stateCls = m.done ? 'past' : n < m.week ? 'past' : n === m.week ? 'now' : '';
    return `<i class="mdot ${stateCls} ${de ? 'de' : ''}"></i>`;
  }).join('');
  let msg;
  if (m.done) msg = `<span class="deload">This block is finished.</span> Start a fresh mesocycle to keep progressing.`;
  else if (m.deloadDue) msg = `<span class="deload">Deload week.</span> Cut working sets ~40–50% and leave 3–4 reps in reserve to shed fatigue before the next block.`;
  else if (m.before) msg = `Your block begins the week of ${esc(fmtShort(dateToStr(mondayOf(parseDate(m.start)))))}.`;
  else msg = `Push volume and intensity — the last week (week ${m.weeks}) is your deload.`;
  return `<div class="card">
    <div class="meso-head"><b class="gold">${m.done || m.before ? m.phase : `Week ${m.week} of ${m.weeks}`}</b>${!m.done && !m.before ? ` · ${esc(m.phase)}` : ''}</div>
    <div class="mdots big" style="margin:10px 0">${dots}</div>
    <p class="faint" style="font-size:13px;margin:6px 0 12px">${msg}</p>
    <div class="btn-row">
      ${m.done ? `<button class="btn gold" data-act="meso:new" style="flex:1">Start new block</button>` : ''}
      <button class="btn ghost" data-act="meso:edit" style="flex:1">${m.done ? 'Edit' : 'Edit block'}</button>
    </div>
  </div>`;
}

function openMesoSheet() {
  const cfg = getMeso() || {};
  const start = cfg.start || dateToStr(mondayOf(new Date()));
  openSheet(`
    <h3>Mesocycle</h3>
    <p class="muted" style="margin-top:-6px">A block of progressively harder weeks ending in a deload. The final week is the deload. Kept on this device.</p>
    <label class="field"><span>Block start</span><input type="date" id="meso-start" value="${start}" /></label>
    <label class="field" style="margin-top:12px"><span>Length — weeks, including the deload</span>
      <input type="number" id="meso-weeks" inputmode="numeric" min="2" max="12" value="${cfg.weeks || 5}" /></label>
    <div class="sheet-actions"><button class="btn gold" data-act="meso:save">Save</button></div>
    ${cfg.start ? `<div class="sheet-actions" style="margin-top:8px"><button class="btn ghost" data-act="meso:clear">Stop tracking</button></div>` : ''}
    <div class="sheet-actions" style="margin-top:8px"><button class="btn ghost" data-act="sheet:close">Cancel</button></div>
  `);
}

/* ---- Progression plan + lagging body-part flags -------------------------- */
// Per-muscle recommendation from the last 3 weeks of working-set volume vs the
// hypertrophy landmark band, plateau-aware and deload-aware. This is the
// "add a set when a muscle plateaus" engine.
function progressionPlan(weeks, buckets) {
  const deload = !!(mesoStatus(todayStr()) || {}).deloadDue;
  const last = weeks[weeks.length - 1];
  const prev = weeks[weeks.length - 2];
  const prev2 = weeks[weeks.length - 3];
  const setsIn = (w, m) => (w && w.byMuscle[m]) || 0;
  return buckets.map((m) => {
    const [lo, hi] = targetFor(m);
    const cur = setsIn(last, m), p1 = setsIn(prev, m), p2 = setsIn(prev2, m);
    // Flat or declining across the recent weeks we have data for.
    const flat = cur <= p1 && (prev2 ? p1 <= p2 : true);
    let rec, cls, next;
    if (deload) { rec = 'Deload — pull volume back'; cls = 'de'; next = Math.max(2, Math.round(lo / 2)); }
    else if (cur > hi) { rec = 'High volume — hold & recover'; cls = 'high'; next = hi; }
    else if (cur < lo) { rec = 'Below minimum — build up'; cls = 'under'; next = Math.min(cur + 2, lo); }
    else if (cur >= hi) { rec = 'Near the ceiling — hold, then deload'; cls = 'high'; next = hi; }
    else if (flat) { rec = 'Plateaued — add a set'; cls = 'add'; next = Math.min(cur + 1, hi); }
    else { rec = 'Progressing — hold this volume'; cls = 'ok'; next = cur; }
    const nextTxt = next === cur ? `keep ${cur}/wk` : `${next > cur ? '→ ' : '↓ '}${next}/wk`;
    return { m, cur, lo, hi, rec, cls, nextTxt };
  });
}

// Muscles trained recently but averaging below their weekly minimum.
function laggingMuscles(weeks, buckets) {
  const recent = weeks.slice(-3);
  if (!recent.length) return [];
  return buckets.map((m) => {
    const vals = recent.map((w) => (w.byMuscle[m] || 0));
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const [lo] = targetFor(m);
    return { m, avg: Math.round(avg * 10) / 10, lo, gap: lo - avg };
  }).filter((x) => x.gap > 0.5).sort((a, b) => b.gap - a.gap);
}

function progressionCard(weeks, buckets) {
  if (!buckets.length) return `<div class="card"><p class="muted">Log a couple of weeks of working sets to get progression suggestions.</p></div>`;
  const deload = !!(mesoStatus(todayStr()) || {}).deloadDue;
  const plan = progressionPlan(weeks, buckets);
  const lag = laggingMuscles(weeks, buckets);
  const lagLine = lag.length
    ? `<div class="lag-flag">⚠️ <b>Lagging:</b> ${lag.map((x) => `${esc(x.m)}`).join(', ')} — under the weekly minimum lately. Add sets here first.</div>`
    : `<div class="lag-flag ok">✓ No lagging muscles — every trained group is at or above its weekly minimum.</div>`;
  const rows = plan.map((p) => `
    <div class="plan-row">
      <span class="plan-m">${esc(p.m)}</span>
      <span class="plan-rec pr-${p.cls}">${esc(p.rec)}</span>
      <span class="plan-next">${esc(p.nextTxt)}</span>
    </div>`).join('');
  return `<div class="card">
    ${lagLine}
    <div class="plan">${rows}</div>
    <div class="wt-legend"><span class="faint">From your last 3 weeks of working sets vs hypertrophy landmarks${deload ? ' · deload week' : ''}.</span></div>
  </div>`;
}

/* ---- Progress view ------------------------------------------------------- */
function progressView() {
  const completed = state.logs.filter(isWorking);
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

    <h2 class="section">Mesocycle</h2>
    ${mesoCard()}

    <h2 class="section">Sets per muscle · per week</h2>
    <div class="card">
      ${svgStackedBars(weeks, buckets)}
      ${legendHtml(buckets)}
    </div>

    <h2 class="section">Weekly volume vs target</h2>
    <div class="card">${buckets.length ? weeklyTargetsHtml(weeks[weeks.length - 1], buckets) : '<p class="muted">Log some sets to see your weekly volume against hypertrophy targets.</p>'}</div>

    <h2 class="section">Progression plan</h2>
    ${progressionCard(weeks, buckets)}

    <h2 class="section">Muscle balance · ${rangeLabel}</h2>
    <div class="card">${balItems.length ? hBarsHtml(balItems, rSets) : '<p class="muted">No sets in this range.</p>'}</div>

    <h2 class="section">Weekly volume ${trend}</h2>
    <div class="card">${svgVBars(weeks, 'var(--gold)')}
      <div class="faint" style="font-size:11px;text-align:right;margin-top:2px">this week ${fmtNum(Math.round(lastV))} ${unit()}</div>
    </div>

    ${exNames.length ? `<h2 class="section">Strength progression</h2><div class="card">${progChart}</div>` : ''}

    ${bodyCard()}

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
    state.authErr = null;
    const joined = await processPendingJoin();
    if (!joined) { state.tab = 'today'; state.selectedDate = todayStr(); state.selectedDayId = null; render(); }
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
  state.meals = await DB.mealsByProfile(uid); // nutrition stays device-local for now
  state.body = await DB.bodyByProfile(uid);   // body metrics device-local for now
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
  if (state.threadId) return threadView();
  if (state.groupId) return groupDetailView();
  const mode = state.peopleMode;
  const seg = `<div class="seg seg-4">
    <button class="${mode === 'feed' ? 'on' : ''}" data-act="people:mode" data-m="feed">Feed</button>
    <button class="${mode === 'discover' ? 'on' : ''}" data-act="people:mode" data-m="discover">Find</button>
    <button class="${mode === 'following' ? 'on' : ''}" data-act="people:mode" data-m="following">Follows</button>
    <button class="${mode === 'groups' ? 'on' : ''}" data-act="people:mode" data-m="groups">Groups</button>
  </div>`;
  const refresh = mode === 'feed' ? 'people:refreshFeed' : mode === 'groups' ? 'people:refreshGroups' : 'people:refresh';
  const head = `<div class="people-head"><h1 class="view-title" style="margin:2px">People</h1>
      <button class="btn sm ghost" data-act="${refresh}">↻</button></div>`;

  if (mode === 'feed') return head + seg + feedHtml();
  if (mode === 'groups') return head + seg + groupsListHtml();

  let list = state.people;
  if (list && mode === 'following') { const f = state.follows || new Set(); list = list.filter((p) => f.has(p.id)); }
  return head + seg + (
    state.peopleErr ? `<div class="card"><p class="muted">Couldn't load people: ${esc(state.peopleErr)}</p></div>`
      : state.people === null ? '<div class="card"><p class="muted">Loading…</p></div>'
      : list.length === 0 ? emptyState(mode === 'following' ? '➕' : '👥',
          mode === 'following' ? 'Not following anyone yet' : 'No one here yet',
          mode === 'following' ? 'Open someone from Discover and tap Follow to build your circle.' : 'Friends who add Iron Log and create an account will show up here.', '')
      : `<div class="people-list">${list.map(userCard).join('')}</div>`);
}

function feedHtml() {
  if (state.feedErr) return `<div class="card"><p class="muted">Couldn't load feed: ${esc(state.feedErr)}</p></div>`;
  if (state.feed === null) return '<div class="card"><p class="muted">Loading…</p></div>';
  if (!state.feed.length) return emptyState('📣', 'Your feed is quiet',
    'Follow people in Discover — their sessions and PRs will show up here, right alongside yours.', '');
  return `<div class="feed">${state.feed.map(feedCard).join('')}</div>`;
}

function feedCard(a) {
  const name = esc(a.display_name || a.username || 'Someone');
  const ini = esc((a.display_name || a.username || '?').slice(0, 1).toUpperCase());
  const d = a.data || {}, unitL = esc(d.unit || 'lb');
  let line = name, sub = '', cls = a.type;
  if (a.type === 'pr') {
    line = `🏆 ${name} hit a PR`;
    sub = `${esc(d.exercise || '')} ${fmtNum(d.weight)}×${d.reps} · est ${fmtNum(d.e1rm)} ${unitL}`;
  } else if (a.type === 'session') {
    line = `${name} trained${d.dayName ? ' ' + esc(d.dayName) : ''}`;
    sub = `${d.sets} set${d.sets === 1 ? '' : 's'} · ${fmtNum(d.volume)} ${unitL}${d.muscles && d.muscles.length ? ' · ' + esc(d.muscles.slice(0, 4).join(', ')) : ''}`;
  } else if (a.type === 'joined') {
    line = `🎉 ${name} joined Iron Log`; sub = 'Say hi 👋';
  }
  const n = state.commentCounts[a.id] || 0;
  return `<button class="feed-card ${cls}" data-act="feed:open" data-id="${a.id}">
    <div class="ava">${ini}</div>
    <div class="fc-main"><div class="fc-line">${line}</div>${sub ? `<div class="fc-sub">${sub}</div>` : ''}
      <div class="fc-cmt">💬 ${n ? n + (n === 1 ? ' comment' : ' comments') : 'Comment'}</div></div>
    <div class="fc-time">${relTime(a.created_at)}</div>
  </button>`;
}

async function loadFeed() {
  state.feed = null; state.feedErr = null; render();
  try {
    const ids = [...(state.follows || new Set()), state.profileId].filter(Boolean);
    state.feed = await Cloud.feed(ids);
    try { state.commentCounts = await Cloud.commentCounts(state.feed.map((a) => a.id)); } catch (e) { /* counts optional */ }
  } catch (e) { state.feedErr = e.message; }
  render();
}

async function loadThread(activityId) {
  state.threadId = activityId;
  state.thread = (state.feed || []).find((a) => a.id === activityId) || null;
  state.threadComments = null; render();
  try { state.threadComments = await Cloud.comments(activityId); }
  catch (e) { state.threadComments = []; }
  render();
}

function threadView() {
  const a = state.thread;
  const back = `<button class="btn sm ghost" data-act="feed:closethread">‹ Feed</button>`;
  const cs = state.threadComments;
  const rows = cs === null ? '<p class="muted" style="padding:8px 2px">Loading…</p>'
    : cs.length === 0 ? '<p class="muted" style="padding:8px 2px">No comments yet. Be the first.</p>'
    : cs.map((c) => `<div class="cmt">
        <button class="ava sm" data-act="people:view" data-id="${c.user_id}">${esc((c.display_name || c.username || '?').slice(0, 1).toUpperCase())}</button>
        <div class="cmt-body"><div class="cmt-head"><b>${esc(c.display_name || c.username || 'Someone')}</b> <span class="faint">${relTime(c.created_at)}</span></div>
          <div class="cmt-text">${esc(c.body)}</div></div>
        ${c.user_id === state.profileId ? `<button class="cmt-x" data-act="comment:del" data-id="${c.id}" aria-label="Delete">✕</button>` : ''}
      </div>`).join('');
  return `
    <div class="people-head">${back}</div>
    ${a ? `<div class="feed-card ${a.type} static">${feedCardInner(a)}</div>` : ''}
    <h2 class="section">Comments</h2>
    <div class="card">
      <div class="cmt-list">${rows}</div>
      <div class="cmt-add">
        <input type="text" id="cmt-input" maxlength="500" placeholder="Add a comment…" autocomplete="off" />
        <button class="btn gold sm" data-act="comment:add">Post</button>
      </div>
    </div>`;
}

// The inner content of a feed card (without the wrapping button), for the
// static header shown above a comment thread.
function feedCardInner(a) {
  const name = esc(a.display_name || a.username || 'Someone');
  const ini = esc((a.display_name || a.username || '?').slice(0, 1).toUpperCase());
  const d = a.data || {}, unitL = esc(d.unit || 'lb');
  let line = name, sub = '';
  if (a.type === 'pr') { line = `🏆 ${name} hit a PR`; sub = `${esc(d.exercise || '')} ${fmtNum(d.weight)}×${d.reps} · est ${fmtNum(d.e1rm)} ${unitL}`; }
  else if (a.type === 'session') { line = `${name} trained${d.dayName ? ' ' + esc(d.dayName) : ''}`; sub = `${d.sets} set${d.sets === 1 ? '' : 's'} · ${fmtNum(d.volume)} ${unitL}${d.muscles && d.muscles.length ? ' · ' + esc(d.muscles.slice(0, 4).join(', ')) : ''}`; }
  else if (a.type === 'joined') { line = `🎉 ${name} joined Iron Log`; sub = ''; }
  return `<button class="ava" data-act="people:view" data-id="${a.user_id}">${ini}</button>
    <div class="fc-main"><div class="fc-line">${line}</div>${sub ? `<div class="fc-sub">${sub}</div>` : ''}</div>
    <div class="fc-time">${relTime(a.created_at)}</div>`;
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
  const completed = logs.filter(isWorking);
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
// Shared leaderboard body (metric chips + optional lift picker + ranked rows)
// used by both the Ranks tab and a group's Board. `users` are profile rows.
function leaderboardBody(users) {
  const metric = state.ranksMetric;
  const metricChips = [['lift', 'Top lift'], ['volume', 'Volume'], ['sessions', 'Sessions'], ['sets', 'Sets']]
    .map(([m, label]) => `<button class="chip ${metric === m ? 'on' : ''}" data-act="ranks:metric" data-m="${m}">${label}</button>`).join('');
  let rows = [], valFmt, liftPicker = '';
  if (metric === 'lift') {
    const counts = {};
    users.forEach((u) => Object.keys(u.lifts || {}).forEach((ex) => { counts[ex] = (counts[ex] || 0) + 1; }));
    const lifts = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
    if (lifts.length && (!state.ranksLift || !counts[state.ranksLift])) state.ranksLift = lifts[0];
    if (!lifts.length) {
      return `<div class="chip-row">${metricChips}</div>` +
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
  return `<div class="chip-row">${metricChips}</div>${liftPicker}<div class="rank-list">${list}</div>`;
}

/* ---- Groups -------------------------------------------------------------- */
async function loadGroups() {
  state.groupsMine = null; state.groupsPublic = null; state.groupsErr = null; render();
  try {
    const [mine, pub] = await Promise.all([Cloud.myGroups(), Cloud.publicGroups()]);
    state.groupsMine = mine; state.groupsPublic = pub;
    const ids = [...new Set([...mine.map((g) => g.id), ...pub.map((g) => g.id)])];
    state.groupCounts = await Cloud.memberCounts(ids);
  } catch (e) { state.groupsErr = e.message; }
  render();
}

async function loadGroup(id) {
  state.groupId = id; state.group = null; state.groupMembers = null; state.groupProfiles = null; state.groupFeed = null; state.groupTab = 'feed'; render();
  try {
    state.group = (state.groupsMine || []).concat(state.groupsPublic || []).find((x) => x.id === id) || await Cloud.groupById(id);
    const members = await Cloud.groupMembers(id);
    state.groupMembers = members;
    const ids = members.map((m) => m.user_id);
    const [profiles, feed] = await Promise.all([Cloud.usersByIds(ids), Cloud.feed(ids)]);
    state.groupProfiles = profiles; state.groupFeed = feed;
    try { state.commentCounts = Object.assign(state.commentCounts || {}, await Cloud.commentCounts(feed.map((a) => a.id))); } catch (e) {}
  } catch (e) { /* leave nulls -> loading/empty states */ }
  render();
}

const groupIsMember = () => (state.groupMembers || []).some((m) => m.user_id === state.profileId);

function groupsListHtml() {
  if (state.groupsErr) return `<div class="card"><p class="muted">Couldn't load groups: ${esc(state.groupsErr)}</p></div>`;
  if (state.groupsMine === null) return '<div class="card"><p class="muted">Loading…</p></div>';
  const counts = state.groupCounts || {};
  const gcard = (g, joined) => {
    const n = counts[g.id] || 0;
    return `<button class="user-card" data-act="group:open" data-id="${g.id}">
      <div class="ava sq">${esc((g.name || '?').slice(0, 1).toUpperCase())}</div>
      <div class="uc-main"><div class="uc-name">${esc(g.name)}${g.is_public ? '' : ' <span class="pill">private</span>'}${joined ? ' <span class="pill follow">joined</span>' : ''}</div>
        <div class="uc-sub">${n} member${n === 1 ? '' : 's'}${g.description ? ' · ' + esc(g.description) : ''}</div></div>
      <span class="chev">›</span></button>`;
  };
  const mineIds = new Set((state.groupsMine || []).map((g) => g.id));
  const discover = (state.groupsPublic || []).filter((g) => !mineIds.has(g.id));
  return `
    <button class="btn gold block" data-act="group:create" style="margin-bottom:14px">+ Create a group</button>
    <h2 class="section" style="margin-top:6px">Your groups</h2>
    ${state.groupsMine.length ? `<div class="people-list">${state.groupsMine.map((g) => gcard(g, true)).join('')}</div>`
      : '<div class="card"><p class="muted">You’re not in any groups yet. Create one or join with a code.</p></div>'}
    <h2 class="section">Discover</h2>
    ${discover.length ? `<div class="people-list">${discover.map((g) => gcard(g, false)).join('')}</div>`
      : '<p class="muted" style="margin:6px 2px">No public groups yet.</p>'}
  `;
}

function groupDetailView() {
  const g = state.group;
  const back = `<button class="btn sm ghost" data-act="group:back">‹ Groups</button>`;
  if (state.groupMembers === null && !g) return `<div class="people-head">${back}</div><div class="card"><p class="muted">Loading…</p></div>`;
  if (!g) return `<div class="people-head">${back}</div>` + emptyState('🔒', 'Group unavailable', 'This group may have been deleted.', '');
  const isMember = groupIsMember(), isOwner = g.owner_id === state.profileId;
  const canChat = isMember || isOwner;
  const count = (state.groupMembers || []).length;
  let tab = state.groupTab;
  if (tab === 'chat' && !canChat) tab = 'feed';
  const tabs = canChat ? ['feed', 'board', 'chat', 'members'] : ['feed', 'board', 'members'];
  const label = { feed: 'Feed', board: 'Board', chat: 'Chat', members: 'Members' };
  const seg = `<div class="seg${tabs.length === 4 ? ' seg-4' : ''}">${tabs.map((t) =>
    `<button class="${tab === t ? 'on' : ''}" data-act="group:tab" data-t="${t}">${label[t]}</button>`).join('')}</div>`;
  let body = '';
  if (state.groupMembers === null) body = '<div class="card"><p class="muted">Loading…</p></div>';
  else if (tab === 'feed') {
    body = state.groupFeed === null ? '<div class="card"><p class="muted">Loading…</p></div>'
      : state.groupFeed.length ? `<div class="feed">${state.groupFeed.map(feedCard).join('')}</div>`
      : emptyState('📣', 'Quiet in here', 'When members log workouts and PRs, they show up here.', '');
  } else if (tab === 'board') {
    body = state.groupProfiles ? leaderboardBody(state.groupProfiles) : '<div class="card"><p class="muted">Loading…</p></div>';
  } else if (tab === 'chat') {
    body = chatBody();
  } else {
    body = `<div class="people-list">${(state.groupMembers || []).map((m) => `<button class="user-card" data-act="people:view" data-id="${m.user_id}">
      <div class="ava">${esc((m.display_name || m.username || '?').slice(0, 1).toUpperCase())}</div>
      <div class="uc-main"><div class="uc-name">${esc(m.display_name || m.username)}${m.role === 'owner' ? ' <span class="pill muscle">owner</span>' : ''}${m.user_id === state.profileId ? ' <span class="pill follow">you</span>' : ''}</div>
        <div class="uc-sub">@${esc(m.username || '')}</div></div><span class="chev">›</span></button>`).join('')}</div>`;
  }
  const actions = (isOwner || isMember)
    ? `<div class="gh-actions"><button class="btn sm" data-act="group:invite" data-id="${g.id}">🔗 Invite</button>${isOwner ? `<button class="btn sm danger" data-act="group:delete" data-id="${g.id}">Delete</button>` : `<button class="btn sm" data-act="group:leave" data-id="${g.id}">Leave</button>`}</div>`
    : `<button class="btn gold sm" data-act="group:join" data-id="${g.id}">Join</button>`;
  return `
    <div class="people-head">${back}${actions}</div>
    <div class="profile-hero">
      <div class="ava lg sq">${esc((g.name || '?').slice(0, 1).toUpperCase())}</div>
      <div style="flex:1"><div class="ph-name">${esc(g.name)}</div>
        <div class="ph-sub">${count} member${count === 1 ? '' : 's'}${g.is_public ? '' : ' · private'}</div>
        ${g.description ? `<div class="ph-follow">${esc(g.description)}</div>` : ''}</div>
    </div>
    ${seg}
    ${body}
  `;
}

function inviteLink(g) { return location.origin + location.pathname + '?join=' + g.invite_code; }

/* ---- Group chat ---------------------------------------------------------- */
function chatBody() {
  const msgs = state.groupMessages;
  const list = msgs === null ? '<p class="muted" style="padding:10px 2px">Loading…</p>'
    : msgs.length === 0 ? '<p class="muted" style="padding:10px 2px">No messages yet. Say hey 👋</p>'
    : msgs.map(chatBubble).join('');
  return `<div class="chat">
    <div class="chat-list" id="chat-list">${list}</div>
    <div class="chat-add">
      <input type="text" id="chat-input" maxlength="1000" placeholder="Message the group…" autocomplete="off" />
      <button class="btn gold sm" data-act="chat:send">Send</button>
    </div>
  </div>`;
}

function chatBubble(m) {
  const mine = m.user_id === state.profileId;
  if (mine) {
    return `<div class="msg me"><div class="bubble" data-act="chat:del" data-id="${m.id}" title="Tap to delete">${esc(m.body)}<span class="msg-time">${relTime(m.created_at)}</span></div></div>`;
  }
  return `<div class="msg">
    <button class="ava sm" data-act="people:view" data-id="${m.user_id}">${esc((m.display_name || m.username || '?').slice(0, 1).toUpperCase())}</button>
    <div><div class="msg-name">${esc(m.display_name || m.username || 'Someone')}</div>
      <div class="bubble">${esc(m.body)}<span class="msg-time">${relTime(m.created_at)}</span></div></div>
  </div>`;
}

async function loadGroupMessages(groupId) {
  try { state.groupMessages = await Cloud.groupMessages(groupId); }
  catch (e) { state.groupMessages = []; }
}

function openCreateGroupSheet() {
  openSheet(`
    <h3>Create a group</h3>
    <label class="field"><span>Name</span><input type="text" id="grp-name" placeholder="e.g. Iron Brothers" /></label>
    <label class="field"><span>Description (optional)</span><input type="text" id="grp-desc" placeholder="What's this crew about?" /></label>
    <label class="row-check"><input type="checkbox" id="grp-public" checked /> <span>Public — anyone can find & join</span></label>
    <p class="faint" style="font-size:12px;margin-top:-4px">Private groups are joined with an invite code you share.</p>
    <div class="sheet-actions"><button class="btn gold" data-act="group:createsave">Create</button></div>
    <div class="sheet-actions" style="margin-top:8px"><button class="btn ghost" data-act="sheet:close">Cancel</button></div>
  `);
  const n = document.getElementById('grp-name'); if (n) n.focus();
}

function ranksView() {
  if (state.peopleErr) return `<h1 class="view-title">Ranks</h1><div class="card"><p class="muted">Couldn't load: ${esc(state.peopleErr)}</p></div>`;
  if (state.people === null) return `<h1 class="view-title">Ranks</h1><div class="card"><p class="muted">Loading…</p></div>`;
  const scope = state.ranksScope;
  let users = state.people.slice();
  if (scope === 'following') { const f = state.follows || new Set(); users = users.filter((u) => f.has(u.id) || u.id === state.profileId); }
  const scopeSeg = `<div class="seg">
    <button class="${scope === 'all' ? 'on' : ''}" data-act="ranks:scope" data-s="all">Everyone</button>
    <button class="${scope === 'following' ? 'on' : ''}" data-act="ranks:scope" data-s="following">You + Following</button>
  </div>`;
  return `<h1 class="view-title">Ranks</h1>${scopeSeg}${leaderboardBody(users)}`;
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
  logs.filter((l) => isWorking(l) && l.weight > 0 && l.reps > 0).forEach((l) => { (byEx[l.exercise] = byEx[l.exercise] || []).push(l); });
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
// The exercise sheet is a small stateful flow: pick a movement from the library
// (or add a custom one), then configure sets/reps.
let exSheet = null;

function openExerciseSheet(dayId, exId) {
  const day = state.split.find((d) => d.id === dayId);
  const e = exId ? day.exercises.find((x) => x.id === exId) : null;
  exSheet = { mode: 'split', dayId, exId: exId || null,
    step: exId ? 'config' : 'pick',
    name: e ? e.name : '', muscle: e ? e.muscle : 'Chest', sets: e ? e.sets : 3, reps: e ? e.reps : '8-10',
    query: '', filter: 'All' };
  renderExSheet();
}

function openAddAdhocSheet() {
  exSheet = { mode: 'adhoc', step: 'pick', name: '', muscle: 'Chest', query: '', filter: 'All' };
  renderExSheet();
}

function movementResults() {
  const q = exSheet.query.trim().toLowerCase(), f = exSheet.filter;
  return MOVEMENTS.filter((m) => (f === 'All' || m.muscle === f) && (!q || m.name.toLowerCase().includes(q)));
}

function pickerListHtml() {
  const rows = movementResults().map((m) =>
    `<button class="mv-row" data-act="exlib:pick" data-name="${esc(m.name)}" data-muscle="${esc(m.muscle)}">
      <span class="mv-name">${esc(m.name)}</span><span class="pill muscle">${esc(m.muscle)}</span></button>`).join('');
  const q = exSheet.query.trim();
  const custom = `<button class="mv-row custom" data-act="exlib:custom">
    <span class="mv-name">✎ ${q ? 'Add “' + esc(q) + '”' : 'Add a custom movement…'}</span><span class="faint">custom</span></button>`;
  return rows + custom;
}

function renderExSheet() {
  if (exSheet.step === 'pick') {
    const muscles = ['All', ...new Set(MOVEMENTS.map((m) => m.muscle))];
    const chips = muscles.map((m) => `<button class="chip ${exSheet.filter === m ? 'on' : ''}" data-act="exlib:filter" data-m="${m}">${m}</button>`).join('');
    openSheet(`
      <h3>${exSheet.mode === 'adhoc' ? 'Add an exercise' : 'Choose a movement'}</h3>
      ${exSheet.mode === 'adhoc' ? `<p class="muted" style="margin-top:-8px">Logged for ${fmtShort(state.selectedDate)} only — it won't change your split.</p>` : ''}
      <input type="text" id="exlib-search" class="mv-search" placeholder="Search movements…" autocomplete="off" spellcheck="false" value="${esc(exSheet.query)}" />
      <div class="chip-row" style="margin-top:10px">${chips}</div>
      <div id="exlib-results" class="mv-list">${pickerListHtml()}</div>
      <div class="sheet-actions" style="margin-top:10px"><button class="btn ghost" data-act="sheet:close">Cancel</button></div>
    `);
    const s = document.getElementById('exlib-search');
    if (s) { s.focus(); s.addEventListener('input', () => { exSheet.query = s.value; const r = document.getElementById('exlib-results'); if (r) r.innerHTML = pickerListHtml(); }); }
    return;
  }
  // config step
  if (exSheet.mode === 'adhoc') {
    openSheet(`
      <h3>Add “${esc(exSheet.name || 'exercise')}”</h3>
      <label class="field"><span>Name</span><input type="text" id="ad-name" value="${esc(exSheet.name)}" placeholder="e.g. Face Pull" /></label>
      <label class="field"><span>Muscle group</span>
        <select id="ad-muscle">${MUSCLES.map((m) => `<option ${m === exSheet.muscle ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
      <button class="subtle-link" data-act="exlib:browse" style="margin:-2px 0 8px">↩ Back to the library</button>
      <div class="sheet-actions"><button class="btn gold" data-act="adhoc:save">Add</button></div>
      <div class="sheet-actions" style="margin-top:8px"><button class="btn ghost" data-act="sheet:close">Cancel</button></div>
    `);
    const n = document.getElementById('ad-name'); if (n && !exSheet.name) n.focus();
    return;
  }
  openSheet(`
    <h3>${exSheet.exId ? 'Edit exercise' : 'New exercise'}</h3>
    <label class="field"><span>Movement</span><input type="text" id="ex-name" value="${esc(exSheet.name)}" placeholder="e.g. Barbell Bench Press" /></label>
    <button class="subtle-link" data-act="exlib:browse" style="margin:-2px 0 10px">↔ Browse the movement library</button>
    <label class="field"><span>Muscle group</span>
      <select id="ex-muscle">${MUSCLES.map((m) => `<option ${m === exSheet.muscle ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
    <div class="btn-row">
      <label class="field" style="flex:1"><span>Target sets</span><input type="number" id="ex-sets" inputmode="numeric" min="1" max="20" value="${exSheet.sets}" /></label>
      <label class="field" style="flex:1"><span>Target reps</span><input type="text" id="ex-reps" value="${esc(exSheet.reps)}" placeholder="e.g. 8-10" /></label>
    </div>
    <div class="sheet-actions">
      ${exSheet.exId ? `<button class="btn danger" data-act="split:delex" data-day="${exSheet.dayId}" data-ex="${exSheet.exId}">Delete</button>` : ''}
      <button class="btn gold" data-act="split:saveex" data-day="${exSheet.dayId}" data-ex="${exSheet.exId || ''}">Save</button>
    </div>
    <div class="sheet-actions" style="margin-top:8px"><button class="btn ghost" data-act="sheet:close">Cancel</button></div>
  `);
  const n = document.getElementById('ex-name'); if (n && !exSheet.name) n.focus();
}

/* --------------------------------------------------------------------------
   PB detection (fires a toast when a completed set beats prior bests)
   -------------------------------------------------------------------------- */
function checkPB(exName, rec) {
  if (!(rec.weight > 0 && rec.reps > 0)) return;
  const others = state.logs.filter((l) => l.exercise === exName && l.id !== rec.id && isWorking(l) && l.weight > 0 && l.reps > 0);
  const maxW = others.reduce((m, l) => Math.max(m, l.weight), 0);
  const maxVol = others.reduce((m, l) => Math.max(m, l.weight * l.reps), 0);
  if (rec.weight > maxW) showToast(`🏆 New PB — ${fmtNum(rec.weight)} ${unit()}!`, true);
  else if (rec.weight * rec.reps > maxVol) showToast(`🏆 New best set — ${fmtNum(rec.weight)} × ${rec.reps}!`, true);
  // Post a PR to the feed when it beats your best estimated 1RM for this lift.
  const myE = e1rm(rec.weight, rec.reps);
  const maxE = others.reduce((m, l) => Math.max(m, e1rm(l.weight, l.reps)), 0);
  if (myE > maxE && Cloud.enabled) {
    Cloud.pushActivity({ id: `pr_${state.profileId}_${rec.date}_${slug(exName)}`, type: 'pr', date: rec.date,
      username: state.profile.username, display_name: state.profile.name,
      data: { exercise: exName, weight: rec.weight, reps: rec.reps, e1rm: myE, unit: unit() }, created_at: new Date().toISOString() });
    state.feed = null;
  }
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
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target && e.target.id === 'cmt-input') {
    e.preventDefault();
    const btn = document.querySelector('[data-act="comment:add"]'); if (btn) btn.click();
  }
  if (e.key === 'Enter' && e.target && e.target.id === 'chat-input') {
    e.preventDefault();
    const btn = document.querySelector('[data-act="chat:send"]'); if (btn) btn.click();
  }
});

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
    saveTimer = setTimeout(() => { DB.put('logs', rec); Cloud.pushLog(rec); syncStats(); syncSessionActivity(state.selectedDate); }, 250);
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
  else if (act === 'body:metric') { state.bodyMetric = t.value; render(); }
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
    if (state.tab === 'people') {
      state.viewUserId = null; state.viewUser = null; state.threadId = null; state.groupId = null;
      if (state.peopleMode === 'feed') { if (state.feed === null) { loadFeed(); return; } }
      else if (state.peopleMode === 'groups') { if (state.groupsMine === null) { loadGroups(); return; } }
      else if (state.people === null) { loadPeople(); return; }
    }
    if (state.tab === 'ranks' && state.people === null) { loadPeople(); return; }
    render(); return;
  }

  // auth screen
  if (a === 'auth:submit') return authSubmit();
  if (a === 'auth:toggle') { state.authCreate = !state.authCreate; state.authErr = null; renderAuth(); return; }

  // People tab
  if (a === 'people:refresh') return loadPeople();
  if (a === 'people:view') return loadUser(D.id);
  if (a === 'people:back') { state.viewUserId = null; state.viewUser = null; render(); return; }
  if (a === 'people:refreshFeed') return loadFeed();
  if (a === 'feed:open') return loadThread(D.id);
  if (a === 'feed:closethread') { state.threadId = null; state.thread = null; state.threadComments = null; render(); return; }
  if (a === 'comment:add') {
    const inp = document.getElementById('cmt-input');
    const body = (inp && inp.value || '').trim();
    if (!body) { if (inp) inp.focus(); return; }
    const optimistic = { id: 'tmp' + uid(), activity_id: state.threadId, user_id: state.profileId,
      username: state.profile.username, display_name: state.profile.name, body, created_at: new Date().toISOString() };
    state.threadComments = [...(state.threadComments || []), optimistic];
    state.commentCounts[state.threadId] = (state.commentCounts[state.threadId] || 0) + 1;
    render();
    try {
      const saved = await Cloud.addComment({ activityId: state.threadId, body, username: state.profile.username, display_name: state.profile.name });
      const i = state.threadComments.findIndex((c) => c.id === optimistic.id);
      if (i >= 0) { state.threadComments[i] = saved; render(); }
    } catch (e) {
      state.threadComments = state.threadComments.filter((c) => c.id !== optimistic.id);
      state.commentCounts[state.threadId] = Math.max(0, (state.commentCounts[state.threadId] || 1) - 1);
      showToast('Comment failed'); render();
    }
    return;
  }
  if (a === 'comment:del') {
    state.threadComments = (state.threadComments || []).filter((c) => c.id !== D.id);
    state.commentCounts[state.threadId] = Math.max(0, (state.commentCounts[state.threadId] || 1) - 1);
    render();
    try { await Cloud.deleteComment(D.id); } catch (e) {}
    return;
  }
  if (a === 'people:mode') {
    state.peopleMode = D.m;
    if (D.m === 'feed') { if (state.feed === null) return loadFeed(); }
    else if (D.m === 'groups') { if (state.groupsMine === null) return loadGroups(); }
    else if (state.people === null) return loadPeople();
    render(); return;
  }
  if (a === 'people:refreshGroups') return loadGroups();
  if (a === 'group:open') return loadGroup(D.id);
  if (a === 'group:back') { state.groupId = null; state.group = null; render(); return; }
  if (a === 'group:tab') {
    state.groupTab = D.t;
    if (D.t === 'chat') { state.groupMessages = null; render(); await loadGroupMessages(state.groupId); render(); return; }
    render(); return;
  }
  if (a === 'group:invite') {
    const g = state.group; if (!g) return;
    const url = inviteLink(g);
    if (navigator.share) { try { await navigator.share({ title: `Join ${g.name} on Iron Log`, url }); return; } catch (e) { /* fall through to copy */ } }
    try { await navigator.clipboard.writeText(url); showToast('Invite link copied'); }
    catch (e) { prompt('Copy this invite link:', url); }
    return;
  }
  if (a === 'chat:send') {
    const inp = document.getElementById('chat-input');
    const body = (inp && inp.value || '').trim();
    if (!body) return;
    if (inp) inp.value = '';
    const optimistic = { id: 'tmp' + uid(), group_id: state.groupId, user_id: state.profileId,
      username: state.profile.username, display_name: state.profile.name, body, created_at: new Date().toISOString() };
    state.groupMessages = [...(state.groupMessages || []), optimistic];
    renderChatList();
    try {
      const saved = await Cloud.sendGroupMessage({ groupId: state.groupId, body, username: state.profile.username, display_name: state.profile.name });
      const i = state.groupMessages.findIndex((m) => m.id === optimistic.id);
      if (i >= 0) { state.groupMessages[i] = saved; }
    } catch (e) { state.groupMessages = state.groupMessages.filter((m) => m.id !== optimistic.id); showToast('Message failed'); renderChatList(); }
    return;
  }
  if (a === 'chat:del') {
    if (!confirm('Delete this message?')) return;
    state.groupMessages = (state.groupMessages || []).filter((m) => m.id !== D.id);
    renderChatList();
    try { await Cloud.deleteGroupMessage(D.id); } catch (e) {}
    return;
  }
  if (a === 'group:create') return openCreateGroupSheet();
  if (a === 'group:createsave') {
    const name = ((document.getElementById('grp-name') || {}).value || '').trim();
    if (!name) { const el = document.getElementById('grp-name'); if (el) el.focus(); return; }
    const description = ((document.getElementById('grp-desc') || {}).value || '').trim();
    const is_public = (document.getElementById('grp-public') || {}).checked;
    try {
      const g = await Cloud.createGroup({ name, description, is_public, username: state.profile.username, display_name: state.profile.name });
      closeSheet(); await loadGroups(); loadGroup(g.id);
    } catch (e) { showToast('Couldn’t create group'); }
    return;
  }
  if (a === 'group:join') {
    try { await Cloud.joinGroup({ groupId: D.id, username: state.profile.username, display_name: state.profile.name }); } catch (e) {}
    await loadGroups(); loadGroup(D.id); return;
  }
  if (a === 'group:leave') {
    if (!confirm('Leave this group?')) return;
    try { await Cloud.leaveGroup(D.id); } catch (e) {}
    state.groupId = null; state.group = null; loadGroups(); return;
  }
  if (a === 'group:delete') {
    if (!confirm('Delete this group for everyone? This cannot be undone.')) return;
    try { await Cloud.deleteGroup(D.id); } catch (e) {}
    state.groupId = null; state.group = null; loadGroups(); return;
  }

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
    state.feed = null; // following changed → next feed view reloads
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
  if (a === 'today:prefill') {
    const date = state.selectedDate, ex = D.ex, muscle = D.muscle, w = num(D.weight);
    const day = state.split.find((d) => d.id === state.selectedDayId);
    const planned = day && day.exercises.find((x) => x.name === ex);
    const target = planned ? planned.sets : 0;
    const cur = setsFor(date, ex);
    const rows = Math.max(target, cur.reduce((m, l) => Math.max(m, l.setIndex + 1), 0), 1);
    for (let i = 0; i < rows; i++) { const l = cur.find((x) => x.setIndex === i); if (!l || l.weight == null) await upsertSet(date, ex, muscle, i, { weight: w }); }
    const container = document.querySelector(`[data-setrows="${cssEsc(ex)}"]`);
    if (container) {
      const updated = setsFor(date, ex);
      const r = Math.max(target, updated.reduce((m, l) => Math.max(m, l.setIndex + 1), 0));
      let html = '';
      for (let i = 0; i < r; i++) { const l = updated.find((x) => x.setIndex === i) || {}; html += setRow(ex, muscle, i, l, i >= target); }
      container.innerHTML = html;
    }
    showToast(`Filled ${fmtNum(w)} ${unit()}`);
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
  if (a === 'today:settag') { setTagPick = null; return openSetTagSheet(D.ex, D.muscle, parseInt(D.set, 10)); }
  if (a === 'settag:type') {
    setTagPick = D.t;
    document.querySelectorAll('#settag-chips .chip').forEach((c) => c.classList.remove('on'));
    t.classList.add('on');
    return;
  }
  if (a === 'settag:save') {
    const idx = parseInt(D.set, 10);
    const existing = state.logs.find((l) => l.date === state.selectedDate && l.exercise === D.ex && l.setIndex === idx) || {};
    const type = setTagPick || existing.type || 'work';
    const rirRaw = (document.getElementById('settag-rir') || {}).value;
    const rir = rirRaw === '' || rirRaw == null ? null : num(rirRaw);
    await upsertSet(state.selectedDate, D.ex, D.muscle, idx, { type, rir });
    closeSheet(); render(); return;
  }
  if (a === 'today:addex') return openAddAdhocSheet();

  // nutrition
  if (a === 'nut:add') {
    const kcal = num((document.getElementById('nut-kcal') || {}).value);
    const protein = num((document.getElementById('nut-protein') || {}).value);
    const label = ((document.getElementById('nut-label') || {}).value || '').trim();
    if (!kcal && !protein) { const k = document.getElementById('nut-kcal'); if (k) k.focus(); return; }
    const m = { id: uid(), profileId: state.profileId, date: state.selectedDate, kcal: kcal || 0, protein: protein || 0, label, createdAt: Date.now() };
    state.meals.push(m); await DB.put('meals', m); render(); return;
  }
  if (a === 'nut:del') { state.meals = state.meals.filter((m) => m.id !== D.id); await DB.del('meals', D.id); render(); return; }
  if (a === 'nut:goals') return openGoalSheet();
  if (a === 'nut:savegoals') {
    setGoals(num((document.getElementById('g-cal') || {}).value) || 0, num((document.getElementById('g-prot') || {}).value) || 0);
    closeSheet(); render(); return;
  }

  // mesocycle / deload
  if (a === 'meso:edit') return openMesoSheet();
  if (a === 'meso:save') {
    const start = (document.getElementById('meso-start') || {}).value || dateToStr(mondayOf(new Date()));
    const weeks = Math.max(2, Math.min(12, parseInt((document.getElementById('meso-weeks') || {}).value, 10) || 5));
    setMeso({ start, weeks });
    closeSheet(); showToast('Mesocycle saved'); render(); return;
  }
  if (a === 'meso:clear') { setMeso(null); closeSheet(); render(); return; }
  if (a === 'meso:new') {
    const prev = getMeso() || {};
    setMeso({ start: dateToStr(mondayOf(new Date())), weeks: prev.weeks || 5 });
    showToast('New block started'); render(); return;
  }

  // body metrics
  if (a === 'body:log') return openBodySheet();
  if (a === 'body:save') {
    const date = (document.getElementById('body-date') || {}).value || todayStr();
    let added = 0;
    for (const m of BODY_METRICS) {
      const raw = (document.getElementById('body-' + m.key) || {}).value;
      if (raw === '' || raw == null) continue;
      const value = num(raw); if (value == null) continue;
      let rec = state.body.find((b) => b.date === date && b.metric === m.key);
      if (rec) rec.value = value;
      else { rec = { id: uid(), profileId: state.profileId, date, metric: m.key, value, createdAt: Date.now() }; state.body.push(rec); }
      await DB.put('body', rec); added++;
    }
    closeSheet();
    if (added) showToast('Measurements saved');
    render(); return;
  }
  if (a === 'adhoc:save') {
    const name = document.getElementById('ad-name').value.trim();
    const muscle = document.getElementById('ad-muscle').value;
    if (!name) { document.getElementById('ad-name').focus(); return; }
    await upsertSet(state.selectedDate, name, muscle, 0, {});
    closeSheet(); render(); return;
  }

  // movement library picker
  if (a === 'exlib:filter') { exSheet.filter = D.m; renderExSheet(); return; }
  if (a === 'exlib:browse') { exSheet.step = 'pick'; exSheet.query = ''; renderExSheet(); return; }
  if (a === 'exlib:custom') {
    exSheet.name = exSheet.query.trim();
    if (exSheet.filter !== 'All') exSheet.muscle = exSheet.filter;
    exSheet.step = 'config'; renderExSheet(); return;
  }
  if (a === 'exlib:pick') {
    if (exSheet.mode === 'adhoc') { await upsertSet(state.selectedDate, D.name, D.muscle, 0, {}); closeSheet(); render(); return; }
    exSheet.name = D.name; exSheet.muscle = D.muscle; exSheet.step = 'config'; renderExSheet(); return;
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
    if (Cloud.user()) {
      try { await enterCloudUser(); } catch (e) { /* offline */ }
      await processPendingJoin();
    }
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
