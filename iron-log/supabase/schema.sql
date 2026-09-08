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
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

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

-- ---- Row-level security --------------------------------------------------
alter table public.profiles enable row level security;
alter table public.splits   enable row level security;
alter table public.logs     enable row level security;

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
