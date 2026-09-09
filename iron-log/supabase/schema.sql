-- ==========================================================================
-- Iron Log — Supabase schema. Run this once in your project's SQL Editor.
-- (Supabase dashboard → SQL Editor → New query → paste → Run.)
--
-- It creates three tables (profiles, splits, logs) and row-level-security
-- policies that make the app "public within the app": any signed-in user can
-- READ any public profile's split and logs, but can only WRITE their own.
-- ==========================================================================

create extension if not exists citext;

-- One row per account. id matches the Supabase auth user id.
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  username     citext unique not null,
  display_name text not null default '',
  unit         text not null default 'lb',
  is_public    boolean not null default true,
  stats        jsonb not null default '{}'::jsonb,   -- {sessions, sets, volume}
  top_lifts    jsonb not null default '[]'::jsonb,   -- [{exercise, weight, reps, date}]
  lifts        jsonb not null default '{}'::jsonb,   -- {exercise: {weight, reps, date, e1rm}}
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
-- If you created profiles before this column existed, this adds it in place:
alter table public.profiles add column if not exists lifts jsonb not null default '{}'::jsonb;

-- One row per account: the training program (array of days as JSON).
create table if not exists public.splits (
  user_id    uuid primary key references auth.users on delete cascade,
  days       jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- One row per logged set. id is the client-generated id (text).
create table if not exists public.logs (
  id         text primary key,
  user_id    uuid not null references auth.users on delete cascade,
  date       text not null,           -- 'YYYY-MM-DD'
  exercise   text not null,
  muscle     text,
  set_index  int not null default 0,
  weight     numeric,
  reps       numeric,
  done       boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists logs_user_idx on public.logs (user_id);
create index if not exists logs_user_date_idx on public.logs (user_id, date);

-- Follows: one row per (follower -> followee). "Friends" = a mutual pair.
create table if not exists public.follows (
  follower_id uuid not null references auth.users on delete cascade,
  followee_id uuid not null references auth.users on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id)
);
create index if not exists follows_followee_idx on public.follows (followee_id);

-- Activity: feed events (a logged session, a new PR, joining). The actor's
-- username/display_name are denormalised on the row so the feed renders with
-- no joins. id is client-generated and deterministic for de-duping (e.g. one
-- 'session' row per user per day, updated as more sets are logged).
create table if not exists public.activity (
  id           text primary key,
  user_id      uuid not null references auth.users on delete cascade,
  username     citext,
  display_name text,
  type         text not null,          -- 'session' | 'pr' | 'joined'
  date         text,                   -- 'YYYY-MM-DD' for sessions
  data         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists activity_created_idx on public.activity (created_at desc);
create index if not exists activity_user_idx on public.activity (user_id);

-- Comments on feed activity. Actor name denormalised for join-free rendering.
create table if not exists public.comments (
  id           text primary key,
  activity_id  text not null references public.activity(id) on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  username     citext,
  display_name text,
  body         text not null,
  created_at   timestamptz not null default now()
);
create index if not exists comments_activity_idx on public.comments (activity_id, created_at);

-- Groups (crews). Public groups are browsable + open-join; private groups are
-- joined with the invite_code. Membership lives in group_members.
create table if not exists public.groups (
  id          text primary key,
  name        text not null,
  description text not null default '',
  owner_id    uuid not null references auth.users on delete cascade,
  is_public   boolean not null default true,
  invite_code text unique not null,
  created_at  timestamptz not null default now()
);
create table if not exists public.group_members (
  group_id     text not null references public.groups(id) on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  username     citext,
  display_name text,
  role         text not null default 'member',
  created_at   timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists group_members_user_idx on public.group_members (user_id);
create index if not exists group_members_group_idx on public.group_members (group_id);

-- ---- Row-level security --------------------------------------------------
alter table public.profiles enable row level security;
alter table public.splits   enable row level security;
alter table public.logs     enable row level security;
alter table public.follows  enable row level security;
alter table public.activity enable row level security;
alter table public.comments enable row level security;
alter table public.groups   enable row level security;
alter table public.group_members enable row level security;

-- profiles: read public ones (and always your own); write only your own.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (is_public or id = auth.uid());
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- splits: readable when the owner's profile is public (or it's yours).
drop policy if exists splits_read on public.splits;
create policy splits_read on public.splits for select to authenticated
  using (exists (select 1 from public.profiles p
                 where p.id = splits.user_id and (p.is_public or p.id = auth.uid())));
drop policy if exists splits_write on public.splits;
create policy splits_write on public.splits for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists splits_update on public.splits;
create policy splits_update on public.splits for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- logs: same visibility rule as splits.
drop policy if exists logs_read on public.logs;
create policy logs_read on public.logs for select to authenticated
  using (exists (select 1 from public.profiles p
                 where p.id = logs.user_id and (p.is_public or p.id = auth.uid())));
drop policy if exists logs_insert on public.logs;
create policy logs_insert on public.logs for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists logs_update on public.logs;
create policy logs_update on public.logs for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists logs_delete on public.logs;
create policy logs_delete on public.logs for delete to authenticated
  using (user_id = auth.uid());

-- follows: readable by any member (for counts / friend badges); you may only
-- create or remove your OWN follow rows.
drop policy if exists follows_read on public.follows;
create policy follows_read on public.follows for select to authenticated
  using (true);
drop policy if exists follows_insert on public.follows;
create policy follows_insert on public.follows for insert to authenticated
  with check (follower_id = auth.uid());
drop policy if exists follows_delete on public.follows;
create policy follows_delete on public.follows for delete to authenticated
  using (follower_id = auth.uid());

-- activity: readable when the actor's profile is public (or it's yours);
-- you may only write your own activity.
drop policy if exists activity_read on public.activity;
create policy activity_read on public.activity for select to authenticated
  using (exists (select 1 from public.profiles p
                 where p.id = activity.user_id and (p.is_public or p.id = auth.uid())));
drop policy if exists activity_insert on public.activity;
create policy activity_insert on public.activity for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists activity_update on public.activity;
create policy activity_update on public.activity for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists activity_delete on public.activity;
create policy activity_delete on public.activity for delete to authenticated
  using (user_id = auth.uid());

-- comments: readable when the underlying activity is visible; write your own.
drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments for select to authenticated
  using (exists (select 1 from public.activity a join public.profiles p on p.id = a.user_id
                 where a.id = comments.activity_id and (p.is_public or p.id = auth.uid())));
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete to authenticated
  using (user_id = auth.uid());

-- groups: metadata readable by any member (so invite-code lookup works);
-- only the owner writes the group row.
drop policy if exists groups_read on public.groups;
create policy groups_read on public.groups for select to authenticated using (true);
drop policy if exists groups_insert on public.groups;
create policy groups_insert on public.groups for insert to authenticated
  with check (owner_id = auth.uid());
drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists groups_delete on public.groups;
create policy groups_delete on public.groups for delete to authenticated
  using (owner_id = auth.uid());

-- group_members: rows readable by members; you add only yourself (join); you
-- may remove yourself, and a group owner may remove anyone from their group.
drop policy if exists gm_read on public.group_members;
create policy gm_read on public.group_members for select to authenticated using (true);
drop policy if exists gm_insert on public.group_members;
create policy gm_insert on public.group_members for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists gm_delete on public.group_members;
create policy gm_delete on public.group_members for delete to authenticated
  using (user_id = auth.uid()
         or exists (select 1 from public.groups g where g.id = group_members.group_id and g.owner_id = auth.uid()));
