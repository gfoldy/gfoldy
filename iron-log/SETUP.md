# Turning on accounts + the People tab (Supabase)

Iron Log works with **no backend** out of the box (local-only, single device).
To enable **accounts, cloud sync, and the People tab** — where every member has a
profile and can browse anyone else's split and lifts — connect a free Supabase
project. Takes about 5 minutes, one time.

Until you do this, the app keeps working exactly as before in local-only mode.

---

## 1. Create a free Supabase project

1. Go to <https://supabase.com> → **Start your project** → sign in (GitHub works).
2. **New project**. Give it a name (e.g. `iron-log`), set a database password
   (save it somewhere), pick the closest region, and create it. Wait ~1 minute
   for it to spin up.

## 2. Create the tables

1. In the project, open **SQL Editor** (left sidebar) → **New query**.
2. Open `supabase/schema.sql` from this repo, copy its entire contents, paste
   into the editor, and click **Run**. You should see "Success".

This creates the `profiles`, `splits`, `logs`, `follows`, `activity`, and
`comments` tables plus the security rules that make profiles public-to-members
but writable only by their owner. It's **safe to re-run** — if you set up an
earlier version, run `schema.sql` again to add any new tables/columns (follows,
leaderboards, feed, comments).

## 3. Turn OFF email confirmation (important)

Accounts use **username + password**, so there's no email to confirm. If this is
left on, sign-up will appear to hang.

1. **Authentication** (left sidebar) → **Sign In / Providers** → **Email**.
2. Turn **Confirm email** **OFF**. Make sure **Allow new users to sign up** is
   **ON**. Save.

## 4. Copy your keys into the app

1. **Project Settings** (gear icon) → **API**.
2. Copy the **Project URL** and the **anon / public** key (NOT the
   `service_role` key).
3. Open `config.js` in this repo and paste them in:

   ```js
   window.IRONLOG_CONFIG = {
     supabaseUrl: 'https://YOURPROJECT.supabase.co',
     supabaseAnonKey: 'eyJhbGciOi...your anon key...',
   };
   ```

   The anon key is **safe to commit and ship** — it's a public client key, and
   your data is protected by the row-level-security rules from step 2. Never put
   the `service_role` key here.

## 5. Redeploy

```bash
cd ~/gfoldy/iron-log
git add config.js && git commit -m "Connect Supabase backend"
npx vercel --prod --yes
```

Open your URL. You'll now get a **sign-in / create-account** screen instead of
the old "Who's training?" prompt. Create your account, and you (and anyone else
who signs up) will appear in the **People** tab.

On each phone: same URL → Add to Home Screen → create an account. Everyone's data
lives in your shared Supabase project; each person can only edit their own.

---

## Notes & FAQ

- **Privacy:** every profile is public to signed-in members by default. Anyone
  can flip their profile to **private** in the account menu (top-right) — that
  hides them from People and blocks others from viewing their data.
- **Forgot password:** because there's no email on file, there's no automatic
  reset. You (as project owner) can set a new password for anyone in Supabase →
  **Authentication → Users** → the user → **Reset/Update**. For a friends-scale
  app that's usually fine.
- **Cost:** Supabase's free tier is plenty for a personal/friends app (500 MB
  database, 50k monthly active users). No card required.
- **Offline:** logging still works with no signal — entries are queued locally
  and sync up automatically when you're back online.
- **Existing local data:** local-mode data and cloud accounts are separate. If
  you logged workouts in local-only mode first, use **Export backup** (account
  menu) before switching, and I can help import it into your account.
- **Going back to local-only:** blank out the two values in `config.js` and
  redeploy.
