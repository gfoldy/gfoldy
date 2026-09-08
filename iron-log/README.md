# 🏋️ Iron Log

A mobile-first **Progressive Web App** for tracking your gym split. Dark theme,
gold accents, green for completed work. Built as a plain static site (vanilla
HTML/CSS/JS — no framework, no build step) so it deploys anywhere in seconds and
runs **fully offline**.

Every phone is independent: all data lives on-device in **IndexedDB**, tagged to
a local profile you name on first run. No backend, no accounts, no syncing.
You use it on your phone; your fiancée visits the same URL on hers, sets up her
own profile, builds her own split from scratch — same app, separate data.

---

## Features

- **First-run profile** — "Who's training?" tags all data to that name. Multiple
  profiles supported on one device, switchable from the top-right chip.
- **Today** — date picker that auto-selects the matching split day by weekday
  (override anytime). Exercises grouped by muscle, one row per target set with
  weight + reps + a big done checkbox. Live "X/Y sets" per exercise and per day.
  Add an extra unplanned set, or a whole ad-hoc exercise, on the fly.
- **Progress** — total sessions / sets / volume with an 8-week volume trend,
  a habit-tracker grid (weeks × split days), and per-exercise personal bests
  (heaviest weight + best weight×reps, with the date each was hit). A toast
  fires when you beat a PR mid-workout.
- **Split** — add / rename / reorder / delete training days and the exercises
  inside them. Exercises are picked from a **built-in movement library** (~90
  common lifts, each pre-tagged with its muscle group) so names stay consistent
  and the analytics line up — with a custom-movement fallback for anything not
  listed. Target sets and rep range are set per exercise. Empty devices get an
  empty state that guides building from scratch. Edits apply to Today going
  forward and never rewrite already-logged history (logs are keyed by exercise
  **name + date**, not position in the split).
- **PWA** — installable to the iOS/Android home screen, opens full-screen with no
  browser chrome, works with no connection. Dark/gold icons + splash.
- **Backup** — export/import your data as a JSON file (Profiles sheet), since
  device-local data means a lost phone is lost data.

---

## Social mode (optional)

Iron Log runs **local-only** by default — no backend, no accounts, everything on
the device. You can optionally connect a free **Supabase** backend to turn on:

- **Accounts** (username + password) instead of the local "Who's training?" prompt.
- **Cloud sync** — your logs, split and PBs live in the cloud (and still work
  offline, syncing when you reconnect).
- A **People tab** — every member has a public profile; browse anyone's split,
  best lifts and basic metrics. Profiles can be switched to private per person.
- **Follow** other members (mutual follows show as "Friends"), with a
  Discover / Following filter.
- A **Ranks tab** — leaderboards by estimated 1RM per lift, total volume,
  sessions or sets, scoped to everyone or just the people you follow.
- An **activity feed** (People → Feed) — sessions, PRs and joins from you and
  the people you follow, newest first.

It's additive: leave `config.js` blank and the app behaves exactly as before.
Full walkthrough (about 5 minutes, one time): **[SETUP.md](./SETUP.md)**.

---

## Run it locally

Any static file server works. From this folder:

```bash
# Python
python3 -m http.server 5173
# or Node
npx serve .
```

Then open <http://localhost:5173>. (Service workers need `localhost` or HTTPS —
they won't register from a `file://` URL.)

Icons are already generated and committed. To regenerate them:

```bash
node scripts/gen-icons.js
```

---

## Deploy to Vercel

This app lives in the `iron-log/` subdirectory of the repo. That matters for the
**Root Directory** setting below.

### Option A — Vercel CLI (fastest)

```bash
npm i -g vercel          # once
cd iron-log              # deploy from THIS folder
vercel                   # first run: log in, link/create a project, accept defaults
vercel --prod            # promote to your production URL
```

`vercel` from inside `iron-log/` treats this folder as the project root, so the
`vercel.json` here is picked up automatically. It'll give you a URL like
`https://iron-log-xxxx.vercel.app`.

### Option B — Connected GitHub repo (auto-deploy on push)

1. Push this repo to GitHub (already on branch `claude/iron-log-pwa-gs80zz`).
2. In the Vercel dashboard → **Add New… → Project** → import `gfoldy/gfoldy`.
3. **Important:** set **Root Directory** to `iron-log`.
4. Framework Preset: **Other** (it's a static site — no build command, no output
   directory needed). Deploy.
5. Every push to the connected branch now redeploys automatically.

### After it's live

- On **your** phone: open the URL in Safari (iOS) or Chrome (Android) →
  **Share → Add to Home Screen**. Launch it from the icon — full-screen, offline.
  First launch asks "Who's training?"; enter your name and pick *Use the Iron Log
  starter split* to load your program.
- On **her** phone: she visits the **same URL**, adds it to her own home screen,
  enters her name, and picks *Start from scratch* to build her split in the Split
  tab. Her data lives only on her phone; yours only on yours.

> Tip: give it a custom domain in Vercel (Project → Settings → Domains) if you
> want a URL that's easy to type on a new phone.

---

## How the data is structured

IndexedDB database `ironlog` with three stores:

- `profiles` — `{ id, name, unit, createdAt }`
- `splits` — one record per profile: `{ profileId, days: [...] }`
- `logs` — one record per logged set:
  `{ id, profileId, date: "YYYY-MM-DD", exercise, muscle, setIndex, weight, reps, done }`

Because logs reference the **exercise name and date**, renaming, reordering, or
deleting things in your split never corrupts or orphans past workouts.

## Files

```
iron-log/
├── index.html              # app shell
├── styles.css              # dark / gold / green theme
├── app.js                  # all app logic (views, storage, events, charts)
├── cloud.js                # optional Supabase layer (auth, sync, community)
├── config.js               # Supabase URL + anon key (blank = local-only)
├── sw.js                   # service worker (offline cache)
├── manifest.webmanifest    # PWA manifest
├── vercel.json             # static headers (SW no-cache, manifest type)
├── vendor/supabase.js      # vendored Supabase JS client (offline-safe)
├── supabase/schema.sql     # database schema + row-level-security policies
├── SETUP.md                # how to turn on accounts + the People tab
├── icons/                  # generated PNG icons (any + maskable, apple-touch)
└── scripts/gen-icons.js    # regenerates icons/ (zero-dependency PNG writer)
```
