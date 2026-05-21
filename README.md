# Family HQ — Setup Guide (v2)

A live-syncing family organiser for Antoine, Beronia, Joseph, and Thomas:
shared lists (you can add as many as you want — holiday packing, build
punch-list, etc.) and a shared calendar with a proper month view. A change
made on one phone appears on the other within a second or two.

Built as a web app — installs to a phone home screen, no app store.

**This guide is written for whoever is setting it up technically.** Basic
comfort with a terminal and following steps is plenty. Total time: ~30 mins.

---

## What's in this folder

```
family-hq/
├── schema.sql         ← run this once in Supabase (creates the database)
├── index.html
├── package.json
├── vite.config.js
├── .env.example       ← copy to .env and fill in 2 values
└── src/
    ├── App.jsx        ← the whole app
    └── main.jsx
```

---

## Step 1 — Create the Supabase project (the backend)

1. Go to **supabase.com** and sign up (free).
2. Click **New project**. Name it (e.g. "family-hq"), set a database password
   (save it somewhere), pick the region closest to Sydney
   (Australia East/Sydney if available). Wait ~2 min for provisioning.
3. In the project, open **SQL Editor** → **New query**.
4. Open `schema.sql` from this folder, paste the entire contents, click
   **Run**. You should see "Success". This creates all tables, security
   rules, and turns on live sync.

## Step 2 — Get your two API keys

1. In Supabase: **Project Settings** (gear icon) → **API**.
2. Copy two values:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon public** key (a long string under "Project API keys")
3. In this folder, copy `.env.example` to a file named exactly `.env` and
   paste the two values in:

   ```
   VITE_SUPABASE_URL=https://abcd1234.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...the-long-key...
   ```

   The `anon` key is safe to use in a browser app — the database is
   protected by the security rules in `schema.sql`, not by hiding the key.

## Step 3 — Create the household and link all four members

The app needs one "household" row, with Antoine, Beronia, Joseph, and Thomas
each linked to it. **Important:** kids only need accounts if they'll use
their own phones; otherwise just link Antoine and Beronia for now, and add
the kids later when they have their own devices.

**3a. Have each person create an account.** Run the app locally (Step 4) or
use the deployed URL (Step 5). On the sign-in screen each person taps
"Sign up" and creates an account with their email + a password. After
signing up the app says "your account isn't linked to a household yet" and
shows each person a **user ID** — note them all down.

**3b. In Supabase → SQL Editor**, run this (paste in the IDs you collected):

```sql
-- create the household
insert into households (name) values ('Our Household')
returning id;
-- ^ copy the id it returns and use it below as HOUSEHOLD_ID

-- link the family members (replace the placeholders)
-- Skip rows for anyone who doesn't have an account yet.
insert into household_members (household_id, user_id, display_name, colour)
values
  ('HOUSEHOLD_ID', 'ANTOINE_USER_ID', 'Antoine', '#5b8a8a'),
  ('HOUSEHOLD_ID', 'BERONIA_USER_ID', 'Beronia', '#7a8fb8'),
  ('HOUSEHOLD_ID', 'JOSEPH_USER_ID',  'Joseph',  '#a78b6a'),
  ('HOUSEHOLD_ID', 'THOMAS_USER_ID',  'Thomas',  '#8aa67e');
```

**Display name must be one of: `Antoine`, `Beronia`, `Joseph`, `Thomas`.**
The app uses these exact strings to colour-code items and events. If a name
ever changes, update the FAMILY array at the top of `src/App.jsx` to match.

**3c.** Everyone reloads the app. They're now in — sharing the same lists
and calendar live. Shopping and To-Do lists are created automatically the
first time someone opens the Lists tab.

> Adding more people later (e.g. an extended family member): repeat 3a for
> them, then run just the relevant `insert` row with their ID and a new
> name (and update the FAMILY array in App.jsx with their name + colour).

## Step 4 — Run it locally to test (optional but recommended)

You need **Node.js** installed (nodejs.org, LTS version). Then in this folder:

```bash
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). Test: sign up the
accounts, do Step 3, open the same URL in a second browser window, add a
list item, watch it appear in the other window.

## Step 5 — Deploy so all phones can reach it

The local URL only works on one computer. For a real link:

1. Go to **vercel.com**, sign up (free).
2. Easiest path: push this folder to a **GitHub** repo, then in Vercel click
   **New Project** → import that repo.
3. Vercel asks for **Environment Variables** — add the same two from your
   `.env`: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Click **Deploy**. After ~1 minute you get a URL like
   `https://family-hq.vercel.app`.

## Step 6 — Put it on the phones

On each phone, open the Vercel URL in the browser, then:
- **iPhone (Safari):** Share button → **Add to Home Screen**
- **Android (Chrome):** menu (⋮) → **Add to Home screen**

It now has an icon and opens full-screen. Each person signs in once and
stays signed in.

---

## How it works (for the family, in plain English)

**Lists tab.** Tap the big button at the top to switch between lists — out
of the box you have Shopping and To-Do. Tap **+ New list** to create one for
anything: an upcoming holiday, the build punch-list, Christmas, school stuff.
Pick an icon, name it, done. All lists are shared and sync live.

**Calendar tab.** Proper month grid. Each day with events shows colour dots
underneath (orange for Antoine, blue for Beronia, sand for Joseph, moss for
Thomas). Tap any day to see just that day's events. Use the arrows to flip
months ahead or back. **+ Add event** opens the form.

**Live sync.** Anything anyone changes appears on everyone else's phone in
about a second. No refresh, no syncing button.

## Costs

Everything runs on free tiers. Supabase free tier and Vercel free tier both
comfortably cover a family. No credit card needed to start.

## Security notes

- Row Level Security: each household can only ever see its own data. Even
  with the public key, no one outside this household can read the lists.
- Don't commit `.env` to GitHub — `.gitignore` excludes it. Put the keys
  directly in Vercel's dashboard instead.

## Troubleshooting

- **"account isn't linked to a household"** → Step 3b wasn't done for that
  person. Re-check the ID and the spelling of the display name.
- **Items show "—" instead of the owner's name** → that item was added by
  someone whose `display_name` isn't one of the four family names. Fix the
  household_members row.
- **Changes don't sync live** → confirm the three `alter publication` lines
  at the end of `schema.sql` ran without error. Re-run them if unsure.
- **Blank screen after deploy** → environment variables weren't added in
  Vercel, or were named differently. They must be exactly
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

---

## What this version does and doesn't do

**Does (v2):** sign in, multiple shared lists with custom names + icons,
shared calendar with month grid and per-person colour tags, live sync
across all devices, home-screen install, four family members.

**Doesn't (yet):** business/work separation, push notifications, recurring
events, week/year calendar views, photo attachments. All are V2+ candidates
and the codebase is structured so they can be added without a rewrite.
