-- ============================================================
-- Family HQ — Supabase schema (v2)
-- Run this whole file in: Supabase Dashboard → SQL Editor → New query → Run
--
-- Changes from v1:
--   • New "lists" table — supports unlimited custom lists per household
--   • list_items now references lists.id (not a fixed text type)
--   • Family members get colour/icon to match the app
-- ============================================================

-- 1. HOUSEHOLDS ------------------------------------------------
create table households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Our Household',
  created_at  timestamptz not null default now()
);

-- 2. HOUSEHOLD MEMBERS ----------------------------------------
create table household_members (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  display_name  text not null,
  colour        text not null default '#5b8a8a',
  created_at    timestamptz not null default now(),
  unique (household_id, user_id)
);

-- 3. LISTS  (NEW) ---------------------------------------------
-- One row per list. Shopping + To-Do are auto-created for each
-- household; everything else (holidays, build, etc.) is custom.
create table lists (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  name          text not null,
  icon          text not null default '📋',
  position      int  not null default 0,
  is_builtin    boolean not null default false,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

-- 4. LIST ITEMS (references a list now) ------------------------
create table list_items (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  list_id       uuid not null references lists(id) on delete cascade,
  text          text not null,
  done          boolean not null default false,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

-- 5. CALENDAR EVENTS ------------------------------------------
create table events (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  title         text not null,
  event_date    date not null,
  event_time    text,
  who           text,
  colour        text not null default '#5b8a8a',
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

-- ============================================================
-- HELPER: which households does the current user belong to?
-- ============================================================
create or replace function my_household_ids()
returns setof uuid
language sql security definer stable
as $$
  select household_id from household_members where user_id = auth.uid();
$$;

-- ============================================================
-- ROW LEVEL SECURITY — each household sees only its own data
-- ============================================================
alter table households        enable row level security;
alter table household_members enable row level security;
alter table lists             enable row level security;
alter table list_items        enable row level security;
alter table events            enable row level security;

create policy "households_select" on households
  for select using (id in (select my_household_ids()));

create policy "members_select" on household_members
  for select using (household_id in (select my_household_ids()));
create policy "members_insert_self" on household_members
  for insert with check (user_id = auth.uid());

create policy "lists_select" on lists
  for select using (household_id in (select my_household_ids()));
create policy "lists_insert" on lists
  for insert with check (household_id in (select my_household_ids()));
create policy "lists_update" on lists
  for update using (household_id in (select my_household_ids()));
create policy "lists_delete" on lists
  for delete using (household_id in (select my_household_ids()));

create policy "list_items_select" on list_items
  for select using (household_id in (select my_household_ids()));
create policy "list_items_insert" on list_items
  for insert with check (household_id in (select my_household_ids()));
create policy "list_items_update" on list_items
  for update using (household_id in (select my_household_ids()));
create policy "list_items_delete" on list_items
  for delete using (household_id in (select my_household_ids()));

create policy "events_select" on events
  for select using (household_id in (select my_household_ids()));
create policy "events_insert" on events
  for insert with check (household_id in (select my_household_ids()));
create policy "events_update" on events
  for update using (household_id in (select my_household_ids()));
create policy "events_delete" on events
  for delete using (household_id in (select my_household_ids()));

-- ============================================================
-- REALTIME — push changes live to every connected phone
-- ============================================================
alter publication supabase_realtime add table lists;
alter publication supabase_realtime add table list_items;
alter publication supabase_realtime add table events;

-- ============================================================
-- DONE. Next: README → "Step 3: Create the household".
-- ============================================================
