# Coach mode — design and task plan

Status: **planned**, not started. Build it once there are roughly 5–10 paying
clients on an off-the-shelf coaching app (Everfit / TrueCoach). By then, real
clients will have shown which features matter. Until then this document is the
spec.

## Goal

Let a coach (Garrett) run online clients inside Iron Log instead of a
third-party coaching app:

- assign and edit each client's split from the coach's phone
- see every client's logged sets, progression and lagging-muscle flags
- collect a weekly check-in (weight, photos, adherence, notes) and reply to it
- message 1:1

Clients keep using Iron Log exactly as today (Today, Progress, Split). Coach mode
adds a coach-side roster and a client-side check-in. Nothing changes for users
who never connect to a coach.

## What already exists and gets reused

| Piece | Where | Reuse in coach mode |
|---|---|---|
| Split model (`Day[]`) and editor | `packages/core/src/types.ts`, `app/(tabs)/split.tsx` | Coach edits a client's split with the same editor |
| Logged sets with RIR and set types | `logs` table, `LogSet` | Coach reads a client's logs |
| Progression plan, lagging flags, weekly volume, mesocycles | `packages/core/src/progression.ts`, `volume.ts`, `meso.ts`, `analytics.ts` | Run on the client's synced data on the coach's device or in the API |
| Accounts and sessions | `apps/api/lib/auth.ts`, `profiles` | Coach and client are both normal profiles |
| Group chat | `groups`, `group_messages`, `GroupDetail.tsx` | Basis for 1:1 coach–client threads |

## Gaps to close first

1. **Body entries and meals are device-only.** A coach can't see weight trends.
   Sync `BodyEntry` (and optionally `Meal`) to the API before building check-ins.
2. **iOS build and API deployment are not done** (see README "Status"). Clients
   need the app on the App Store, or on TestFlight for a beta group, and the API
   live on Vercel + Postgres.
3. **Push notifications** (on the README roadmap) are needed for "check-in due"
   and "coach replied".

## Data model

New tables, added to `apps/api/schema.sql`:

```sql
-- A coach–client relationship. One active coach per client.
create table if not exists coaching (
  coach_id    text not null references profiles(id) on delete cascade,
  client_id   text not null references profiles(id) on delete cascade,
  status      text not null default 'invited',  -- 'invited' | 'active' | 'paused' | 'ended'
  invite_code text unique,
  started_at  timestamptz,
  ended_at    timestamptz,
  notes       text,                              -- private coach notes about the client
  primary key (coach_id, client_id)
);
create index if not exists coaching_client on coaching(client_id);

-- Body metrics synced from the device (closes gap 1).
create table if not exists body_entries (
  id         text primary key,
  profile_id text not null references profiles(id) on delete cascade,
  date       text not null,
  metric     text not null,
  value      double precision not null,
  created_at timestamptz not null default now()
);
create index if not exists body_entries_profile on body_entries(profile_id, date);

-- Weekly check-in submitted by the client.
create table if not exists checkins (
  id          text primary key,
  client_id   text not null references profiles(id) on delete cascade,
  coach_id    text not null references profiles(id) on delete cascade,
  week_start  text not null,           -- YYYY-MM-DD, Monday
  answers     jsonb not null,          -- { adherence 1-10, sleep, energy, hunger, notes }
  photo_urls  jsonb,                   -- front / side / back
  coach_reply text,
  replied_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (client_id, week_start)
);

-- 1:1 messages (separate from group chat so permissions stay simple).
create table if not exists coach_messages (
  id         text primary key,
  coach_id   text not null references profiles(id) on delete cascade,
  client_id  text not null references profiles(id) on delete cascade,
  sender_id  text not null references profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists coach_messages_pair on coach_messages(coach_id, client_id, created_at);
```

`profiles` gets one column: `is_coach boolean not null default false`.

Photos go to object storage (Vercel Blob), with only URLs in Postgres.

## API routes

All under `apps/api/app/api/coach/`, using `requireUser` from `lib/route.ts`.
Every coach route checks that an `active` `coaching` row links the caller to the
client; every client route checks the caller is that client.

| Route | Method | Who | Does |
|---|---|---|---|
| `/coach/invite` | POST | coach | Create an invite code / link |
| `/coach/join` | POST | client | Accept an invite: creates the `active` row |
| `/coach/clients` | GET | coach | Roster with last session date, last check-in, flags |
| `/coach/clients/[id]` | GET | coach | Client profile, split, recent logs, body trend |
| `/coach/clients/[id]/split` | PUT | coach | Replace the client's split (writes `splits`) |
| `/coach/clients/[id]/notes` | PUT | coach | Private notes |
| `/body` | GET / PUT | self | Sync body entries |
| `/checkins` | GET / POST | client | Submit or list own check-ins |
| `/coach/checkins` | GET | coach | Pending check-ins across clients |
| `/coach/checkins/[id]/reply` | POST | coach | Reply to a check-in |
| `/coach/messages/[clientId]` | GET / POST | both | 1:1 thread |

## App screens (Expo Router)

**Coach side** (shown when `is_coach`):

- **Clients tab**: roster sorted by "needs attention" (check-in waiting, no
  session in 4+ days, lagging muscles flagged). Each row: name, last session,
  check-in status chip.
- **Client detail**: tabs for Overview (body weight trend with `LineChart`,
  weekly volume vs targets, progression plan and lagging flags from
  `@ironlog/core`), Split (the existing editor, writing to the client), Logs,
  Check-ins, Messages, Notes.
- **Check-in inbox**: the week's submissions, each with photos side by side with
  the previous check-in and a reply box.

**Client side** (shown when connected to a coach):

- **Coach card on Today**: "Check-in due Sunday" or "Coach replied".
- **Check-in form**: weight (pre-filled from body entries), 3 photos, adherence,
  sleep, energy, hunger, notes.
- **Messages** with the coach.
- The split shows "Set by Coach Garrett". Clients can log but not edit a
  coach-assigned split, or edits are flagged to the coach.

## Payments

Take payment outside the app with Stripe subscriptions (payment links to start,
a webhook later that sets `coaching.status`). Before App Store submission,
confirm against Apple's current App Review Guidelines how coaching subscriptions
sold outside the app must be handled. Keep purchase flows out of the iOS app
until that is checked.

## Task breakdown

Rough sizes: S = under a day, M = 1–3 days, L = 3–5 days.

| # | Task | Size | Depends on |
|---|---|---|---|
| 1 | Deploy API (Vercel + Postgres) and ship an iOS TestFlight build | M | — |
| 2 | Sync body entries to the API (`body_entries`, `/body`, client sync in `lib/sync.ts`) | M | 1 |
| 3 | `coaching` table, invite / join routes, `is_coach` flag | M | 1 |
| 4 | Coach roster screen + `/coach/clients` | M | 3 |
| 5 | Client detail: overview with core analytics on the client's data | L | 2, 4 |
| 6 | Coach edits a client's split (reuse editor, `PUT /split`, lock on client) | M | 4 |
| 7 | Check-ins: form, photo upload to Blob, coach inbox and reply | L | 2, 3 |
| 8 | 1:1 messages (reuse chat UI) | M | 3 |
| 9 | Push notifications: check-in due, coach replied, new message | M | 7, 8 |
| 10 | Stripe payment links, then webhook to set `coaching.status` | M | 3 |
| 11 | Migrate clients from the third-party app; onboarding guide | S | 1–8 |

Tasks 1–8 make a usable coach mode (about 3–4 weeks of focused work). Tasks 9–11
make it something clients can be moved onto fully.

## Core logic to add (`packages/core`)

- `checkinWeek(date)`: Monday of the check-in week (reuse `dates.ts`).
- `clientAttention(client)`: score used to sort the roster (days since last
  session, pending check-in, number of lagging flags).
- `adherence(logs, split, week)`: planned vs completed sets for the week.

Each gets unit tests next to the existing ones in `packages/core/test/`.

## Open questions

- One coach per client, or allow a client to see a past coach's history? (Plan
  assumes one active coach; history stays with the client.)
- Should clients see the coach's private notes? (Plan: no.)
- Is nutrition logging part of coaching, or macros only as targets? This decides
  whether `Meal` sync is in scope.
