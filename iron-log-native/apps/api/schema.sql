-- Iron Log API — Postgres schema (Vercel Postgres / Neon).
-- Run once against your database (psql "$POSTGRES_URL" -f schema.sql).

create table if not exists profiles (
  id            text primary key,
  username      text unique not null,
  display_name  text not null,
  password_hash text not null,
  unit          text not null default 'lb',
  is_private    boolean not null default false,
  stats         jsonb,        -- { sessions, sets, volume }
  top_lifts     jsonb,        -- [{ exercise, weight, reps, e1rm }]
  created_at    timestamptz not null default now()
);

create table if not exists splits (
  profile_id text primary key references profiles(id) on delete cascade,
  days       jsonb not null
);

create table if not exists logs (
  id         text primary key,
  profile_id text not null references profiles(id) on delete cascade,
  date       text not null,
  exercise   text not null,
  data       jsonb not null
);
create index if not exists logs_profile on logs(profile_id);

create table if not exists follows (
  follower_id text not null references profiles(id) on delete cascade,
  followee_id text not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id)
);

create table if not exists activity (
  id         text primary key,
  user_id    text not null references profiles(id) on delete cascade,
  type       text not null,       -- 'session' | 'pr' | 'join'
  date       text,
  data       jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_user on activity(user_id);
create index if not exists activity_created on activity(created_at desc);

create table if not exists comments (
  id          text primary key,
  activity_id text not null references activity(id) on delete cascade,
  user_id     text not null references profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists comments_activity on comments(activity_id);

create table if not exists groups (
  id          text primary key,
  name        text not null,
  description text,
  is_public   boolean not null default true,
  invite_code text unique,
  owner_id    text not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists group_members (
  group_id  text not null references groups(id) on delete cascade,
  user_id   text not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists group_messages (
  id         text primary key,
  group_id   text not null references groups(id) on delete cascade,
  user_id    text not null references profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists group_messages_group on group_messages(group_id, created_at);
