import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase client ────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function createClientFallback() {
  const noopAsync = async () => ({ data: { session: null } });
  const noop = () => ({ subscribe: () => {}, on: () => ({ subscribe: () => {} }) });
  function makeBuilder(result = []) {
    const builder = {
      select: (..._args) => builder,
      insert: async (..._a) => ({ data: result }),
      update: async (..._a) => ({ data: result }),
      delete: async (..._a) => ({ data: result }),
      maybeSingle: async () => ({ data: null }),
      eq: (..._a) => builder,
      order: (..._a) => builder,
      then: (cb) => Promise.resolve({ data: result }).then(cb),
    };
    return builder;
  }

  return {
    auth: {
      getSession: noopAsync,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithPassword: async () => ({ error: { message: 'Supabase not configured' } }),
      signUp: async () => ({ error: { message: 'Supabase not configured' } }),
      signOut: async () => ({}),
    },
    from: (_table) => makeBuilder([]),
    channel: () => ({ on: () => ({ subscribe: () => {} }), subscribe: () => {} }),
    removeChannel: () => {},
  };
}

const SUPABASE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_KEY);
const supabase = SUPABASE_ENABLED
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : createClientFallback();

// ── Family — adjust here if names/colours ever change ────────────────────
const FAMILY = [
  { label: "Antoine", colour: "#5b8a8a" }, // sage teal
  { label: "Beronia", colour: "#7a8fb8" }, // dusty blue
  { label: "Joseph",  colour: "#a78b6a" }, // warm sand
  { label: "Thomas",  colour: "#8aa67e" }, // soft moss
];
const byLabel = (l) => FAMILY.find((f) => f.label === l) || FAMILY[0];

const ICONS = ["📋","🛒","✓","✈️","🔨","🎂","🎄","🏠","🏥","🐕","🎒","💼","🍳","📚","🎁","🎉"];

const todayISO = () => new Date().toISOString().slice(0, 10);
const monthName = (m) =>
  ["January","February","March","April","May","June",
   "July","August","September","October","November","December"][m];

// ════════════════════════════════════════════════════════════════════════
//  ROOT
// ════════════════════════════════════════════════════════════════════════
export default function App() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <Shell><div style={S.center}>Loading…</div></Shell>;
  return session ? <Home session={session} /> : <AuthScreen onSignIn={(s) => setSession(s)} />;
}

// ════════════════════════════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════════════════════════════
function AuthScreen({ onSignIn }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setMsg("");
    // Local sign-in: bypass Supabase when not configured — create a fake session
    const fakeSession = { user: { id: `local-${Date.now()}`, email: email.trim(), provider: "local" } };
    onSignIn?.(fakeSession);
    setBusy(false);
  };

  return (
    <Shell>
      <style>{CSS}</style>
      <div style={S.authWrap}>
        <div style={S.kicker}>Family Command Centre</div>
        <h1 style={S.h1}>Family HQ</h1>
        <p style={S.authSub}>
          {mode === "signin"
            ? "Sign in to your household."
            : "Create an account, then link it to your household."}
        </p>
        <input style={S.input} placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={{ ...S.input, marginTop: 8 }} type="password" placeholder="Password"
          value={pw} onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()} />
        <button style={{ ...S.solidBtn, width: "100%", marginTop: 12 }}
          onClick={submit} disabled={busy}>
          {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
        {msg && <div style={S.authMsg}>{msg}</div>}
        <button style={S.linkBtn}
          onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMsg(""); }}>
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </Shell>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  HOME (authenticated)
// ════════════════════════════════════════════════════════════════════════
function Home({ session }) {
  const [member, setMember] = useState(undefined);
  const [tab, setTab] = useState("Lists");

  useEffect(() => {
    if (!SUPABASE_ENABLED) {
      // Local/dev mode: provide a default member so the UI can render without Supabase
      setMember({ display_name: "Antoine", household_id: 0 });
      return;
    }
    supabase
      .from("household_members")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setMember(data || null));
  }, [session.user.id]);

  if (member === undefined)
    return <Shell><div style={S.center}>Loading household…</div></Shell>;
  if (member === null)
    return <NoHousehold session={session} />;

  const viewer = byLabel(member.display_name);

  return (
    <Shell>
      <style>{CSS}</style>
      <header style={S.header}>
        <div>
          <div style={S.kicker}>Family Command Centre</div>
          <h1 style={S.h1}>Family HQ</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ ...S.youDot, background: viewer.colour }}>
            {viewer.label[0]}
          </div>
          <button style={S.signOut} onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <nav style={S.tabs}>
        {["Lists", "Calendar"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              ...S.tab,
              ...(tab === t ? { ...S.tabActive, background: viewer.colour } : {}),
            }}>
            {t}
          </button>
        ))}
      </nav>

      <main style={S.main}>
        {tab === "Lists" && (
          <Lists householdId={member.household_id} userId={session.user.id} viewer={viewer} />
        )}
        {tab === "Calendar" && (
          <Calendar householdId={member.household_id} userId={session.user.id} viewer={viewer} />
        )}
      </main>

      <footer style={S.footer}>
        Live-synced · signed in as {viewer.label}
      </footer>
    </Shell>
  );
}

// ── No household yet ───────────────────────────────────────────────────────
function NoHousehold({ session }) {
  return (
    <Shell>
      <style>{CSS}</style>
      <div style={S.authWrap}>
        <h1 style={S.h1}>Almost there</h1>
        <p style={S.authSub}>
          Your account isn't linked to a household yet. Whoever set this up
          needs to add you — see <b>Step 3</b> in the README. Once linked,
          reload this page.
        </p>
        <div style={S.idBox}>
          <div style={S.idLabel}>Your user ID (give this to your setup helper)</div>
          <code style={S.idCode}>{session.user.id}</code>
        </div>
        <button style={{ ...S.linkBtn, marginTop: 16 }}
          onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>
    </Shell>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  LISTS — switcher + custom lists + items
// ════════════════════════════════════════════════════════════════════════
function Lists({ householdId, userId, viewer }) {
  const [lists, setLists] = useState([]);
  const [items, setItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeListId, setActiveListId] = useState(null);
  const [view, setView] = useState("items"); // items | switcher | new
  const [draft, setDraft] = useState("");

  // initial load + realtime
  useEffect(() => {
    let active = true;

    if (!SUPABASE_ENABLED) {
      // Local mode: provide default lists and member so UI is usable without Supabase
      const l1 = { id: `local-list-1`, household_id: householdId, name: "Shopping", icon: "🛒", position: 0, is_builtin: true };
      const l2 = { id: `local-list-2`, household_id: householdId, name: "To-Do", icon: "✓", position: 1, is_builtin: true };
      setLists([l1, l2]);
      setActiveListId(l1.id);
      setItems([]);
      setMembers([{ user_id: userId, display_name: viewer.label || "Antoine", household_id: householdId }]);
      return;
    }

    const loadLists = async () => {
      const { data } = await supabase.from("lists").select("*")
        .eq("household_id", householdId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (!active) return;
      // auto-create Shopping + To-Do on first run if there are none
      if ((data || []).length === 0) {
        await supabase.from("lists").insert([
          { household_id: householdId, name: "Shopping", icon: "🛒", position: 0, is_builtin: true, created_by: userId },
          { household_id: householdId, name: "To-Do",    icon: "✓",  position: 1, is_builtin: true, created_by: userId },
        ]);
        const r = await supabase.from("lists").select("*").eq("household_id", householdId)
          .order("position", { ascending: true });
        if (active) {
          setLists(r.data || []);
          setActiveListId((r.data || [])[0]?.id || null);
        }
      } else {
        setLists(data);
        setActiveListId(data[0].id);
      }
    };

    loadLists();
    supabase.from("list_items").select("*").eq("household_id", householdId)
      .order("created_at", { ascending: false })
      .then(({ data }) => active && setItems(data || []));
    supabase.from("household_members").select("*").eq("household_id", householdId)
      .then(({ data }) => active && setMembers(data || []));

    const listChan = supabase.channel("lists:" + householdId)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "lists",
          filter: "household_id=eq." + householdId },
        (p) => setLists((cur) => applyChange(cur, p))
      ).subscribe();

    const itemChan = supabase.channel("items:" + householdId)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "list_items",
          filter: "household_id=eq." + householdId },
        (p) => setItems((cur) => applyChange(cur, p))
      ).subscribe();

    return () => {
      active = false;
      supabase.removeChannel(listChan);
      supabase.removeChannel(itemChan);
    };
  }, [householdId, userId]);

  const activeList = lists.find((l) => l.id === activeListId);
  const visible = items.filter((i) => i.list_id === activeListId);

  const addItem = async () => {
    if (!draft.trim() || !activeListId) return;
    const text = draft.trim();
    setDraft("");
    await supabase.from("list_items").insert({
      household_id: householdId, list_id: activeListId, text, created_by: userId,
    });
  };
  const toggle = (i) =>
    supabase.from("list_items").update({ done: !i.done }).eq("id", i.id);
  const remove = (i) =>
    supabase.from("list_items").delete().eq("id", i.id);
  const clearDone = () =>
    supabase.from("list_items").delete()
      .eq("household_id", householdId).eq("list_id", activeListId).eq("done", true);

  const createList = async (name, icon) => {
    const { data } = await supabase.from("lists").insert({
      household_id: householdId, name, icon, position: lists.length, created_by: userId,
    }).select().single();
    if (data) setActiveListId(data.id);
    setView("items");
  };
  const deleteList = async (list) => {
    if (!confirm(`Delete the "${list.name}" list and all its items?`)) return;
    await supabase.from("lists").delete().eq("id", list.id);
    const remaining = lists.filter((l) => l.id !== list.id);
    setActiveListId(remaining[0]?.id || null);
  };

  // owner display: the member who created an item
  const ownerLabelFor = (item) => {
    const m = members.find((x) => x.user_id === item.created_by);
    return m?.display_name || "—";
  };

  if (view === "switcher")
    return (
      <ListSwitcher
        lists={lists} items={items}
        activeListId={activeListId}
        onPick={(id) => { setActiveListId(id); setView("items"); }}
        onNew={() => setView("new")}
        onDelete={deleteList}
        accent={viewer.colour}
        onBack={() => setView("items")}
      />
    );

  if (view === "new")
    return (
      <NewListSheet
        accent={viewer.colour}
        onCancel={() => setView("switcher")}
        onCreate={createList}
      />
    );

  return (
    <div className="fadeUp">
      <button onClick={() => setView("switcher")}
        style={{ ...S.listSwitchBtn, color: viewer.colour, borderColor: viewer.colour }}>
        <span>{activeList?.icon} {activeList?.name || "Loading…"}</span>
        <span style={S.switchHint}>Switch list ›</span>
      </button>

      <div style={S.addRow}>
        <input style={S.input}
          placeholder={`Add to ${activeList?.name || "list"}…`}
          value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()} />
        <button style={{ ...S.solidBtn, background: viewer.colour }} onClick={addItem}>Add</button>
      </div>

      <Card title={`${visible.length} items`}>
        {visible.length === 0 ? (
          <Empty>List is empty.</Empty>
        ) : (
          visible.map((i) => {
            const owner = ownerLabelFor(i);
            const ownerColour = byLabel(owner).colour;
            return (
              <div key={i.id} style={S.row}>
                <button onClick={() => toggle(i)}
                  style={{ ...S.check, ...(i.done ? S.checkOn : {}) }}>
                  {i.done ? "✓" : ""}
                </button>
                <span style={{
                  flex: 1,
                  textDecoration: i.done ? "line-through" : "none",
                  color: i.done ? "#a8a89e" : "inherit",
                }}>{i.text}</span>
                <span style={{ ...S.tag, background: ownerColour }}>{owner}</span>
                <button onClick={() => remove(i)} style={S.x}>×</button>
              </div>
            );
          })
        )}
      </Card>

      {visible.some((i) => i.done) && (
        <button style={S.ghostBtn} onClick={clearDone}>Clear completed</button>
      )}
    </div>
  );
}

function ListSwitcher({ lists, items, activeListId, onPick, onNew, onDelete, accent, onBack }) {
  const counts = lists.reduce((acc, l) => {
    acc[l.id] = items.filter((i) => i.list_id === l.id && !i.done).length;
    return acc;
  }, {});
  return (
    <div className="fadeUp">
      <button onClick={onBack} style={S.backBtn}>‹ Back</button>
      <div style={{ ...S.cardTitle, marginBottom: 8 }}>Your lists</div>
      {lists.map((l) => (
        <div key={l.id} style={{
          ...S.listRow,
          ...(l.id === activeListId ? { borderColor: accent, background: "#fbfdfb" } : {}),
        }}>
          <div onClick={() => onPick(l.id)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <div style={S.listIcon}>{l.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={S.listName}>{l.name}</div>
              <div style={S.listMeta}>
                {counts[l.id] === 0 ? "All done" : `${counts[l.id]} open`}
                {l.is_builtin ? "" : " · custom"}
              </div>
            </div>
            {l.id === activeListId && <span style={{ ...S.activeDot, background: accent }} />}
          </div>
          {!l.is_builtin && (
            <button onClick={() => onDelete(l)} style={S.x}>×</button>
          )}
        </div>
      ))}
      <button onClick={onNew} style={{ ...S.newListBtn, color: accent, borderColor: accent }}>
        + New list
      </button>
    </div>
  );
}

function NewListSheet({ onCancel, onCreate, accent }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📋");
  return (
    <div className="fadeUp">
      <button onClick={onCancel} style={S.backBtn}>‹ Back</button>
      <div style={{ ...S.cardTitle, marginBottom: 8 }}>New list</div>
      <input value={name} onChange={(e) => setName(e.target.value)}
        placeholder="What's it for? e.g. Italy holiday, School…"
        style={{ ...S.input, marginBottom: 10 }} />
      <div style={S.iconLabel}>Pick an icon</div>
      <div style={S.iconGrid}>
        {ICONS.map((e) => (
          <button key={e} onClick={() => setIcon(e)}
            style={{
              ...S.iconCell,
              ...(icon === e ? { borderColor: accent, background: "#fbfdfb" } : {}),
            }}>{e}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={onCancel} style={{ ...S.ghostBtn, flex: 1, marginTop: 0 }}>Cancel</button>
        <button onClick={() => name.trim() && onCreate(name.trim(), icon)}
          style={{ ...S.solidBtn, flex: 1, background: accent }}>
          Create
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  CALENDAR — month grid + day list
// ════════════════════════════════════════════════════════════════════════
function Calendar({ householdId, userId, viewer }) {
  const today = new Date();
  const [events, setEvents] = useState([]);
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [picked, setPicked] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "", date: todayISO(), time: "", who: "Antoine",
  });

  useEffect(() => {
    let active = true;
    if (!SUPABASE_ENABLED) {
      setEvents([]);
      return () => { active = false; };
    }
    supabase.from("events").select("*").eq("household_id", householdId)
      .then(({ data }) => active && setEvents(data || []));

    const ch = supabase.channel("events:" + householdId)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "events",
          filter: "household_id=eq." + householdId },
        (p) => setEvents((cur) => applyChange(cur, p))
      ).subscribe();

    return () => { active = false; supabase.removeChannel(ch); };
  }, [householdId]);

  // Month grid (Mon-first, 6 rows)
  const first = new Date(view.y, view.m, 1);
  const startDow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const dayNum = i - startDow + 1;
    cells.push(dayNum >= 1 && dayNum <= daysInMonth ? dayNum : null);
  }
  const ymd = (d) => `${view.y}-${String(view.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const todayKey = todayISO();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const eventsForDay = (d) => events.filter((e) => e.event_date === ymd(d));

  const prev = () => setView(view.m === 0 ? { y: view.y - 1, m: 11 } : { y: view.y, m: view.m - 1 });
  const next = () => setView(view.m === 11 ? { y: view.y + 1, m: 0 } : { y: view.y, m: view.m + 1 });
  const goToday = () => {
    setView({ y: today.getFullYear(), m: today.getMonth() });
    setPicked(null);
  };

  const dayList = picked
    ? events.filter((e) => e.event_date === picked)
        .sort((a, b) => (a.event_time || "").localeCompare(b.event_time || ""))
    : events.filter((e) => e.event_date >= todayKey)
        .sort((a, b) => (a.event_date + (a.event_time || "")).localeCompare(b.event_date + (b.event_time || "")))
        .slice(0, 8);

  const addEvent = async () => {
    if (!form.title.trim()) return;
    const who = byLabel(form.who);
    await supabase.from("events").insert({
      household_id: householdId,
      title: form.title.trim(),
      event_date: form.date,
      event_time: form.time || null,
      who: who.label,
      colour: who.colour,
      created_by: userId,
    });
    setForm({ ...form, title: "", time: "" });
    setShowForm(false);
  };

  const removeEvent = (e) => supabase.from("events").delete().eq("id", e.id);

  return (
    <div className="fadeUp">
      <div style={S.calNav}>
        <button onClick={prev} style={S.calArrow}>‹</button>
        <div>
          <div style={S.calTitle}>{monthName(view.m)} {view.y}</div>
          {(view.y !== today.getFullYear() || view.m !== today.getMonth()) && (
            <button onClick={goToday} style={S.calTodayBtn}>Jump to today</button>
          )}
        </div>
        <button onClick={next} style={S.calArrow}>›</button>
      </div>

      <div style={S.calDow}>
        {["M","T","W","T","F","S","S"].map((d, i) => (
          <div key={i} style={S.dowCell}>{d}</div>
        ))}
      </div>

      <div style={S.calGrid}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} style={S.calCellEmpty} />;
          const dayEvents = eventsForDay(d);
          const dayKey = ymd(d);
          const isToday = dayKey === todayStr;
          const isPicked = picked === dayKey;
          return (
            <button key={i} onClick={() => setPicked(isPicked ? null : dayKey)}
              style={{
                ...S.calCell,
                ...(isToday ? { ...S.calCellToday, background: viewer.colour } : {}),
                ...(isPicked && !isToday ? { ...S.calCellPicked, borderColor: viewer.colour } : {}),
              }}>
              <span style={{
                fontSize: 13,
                fontWeight: isToday ? 700 : 500,
                color: isToday ? "#fff" : "#3a4a4a",
              }}>{d}</span>
              {dayEvents.length > 0 && (
                <div style={S.dotRow}>
                  {dayEvents.slice(0, 4).map((e, ix) => (
                    <span key={ix} style={{
                      ...S.calDot,
                      background: isToday ? "#fff" : (byLabel(e.who).colour),
                    }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button onClick={() => setShowForm(!showForm)}
        style={{ ...S.solidBtn, background: viewer.colour, width: "100%", marginTop: 14 }}>
        {showForm ? "Close" : "+ Add event"}
      </button>

      {showForm && (
        <Card title="New event">
          <input style={S.input} placeholder="What's happening?"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input style={{ ...S.input, flex: 1 }} type="date" value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <input style={{ ...S.input, width: 110 }} type="time" value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {FAMILY.map((m) => (
              <button key={m.label} onClick={() => setForm({ ...form, who: m.label })}
                style={{
                  ...S.whoBtn, borderColor: m.colour,
                  background: form.who === m.label ? m.colour : "transparent",
                  color: form.who === m.label ? "#fff" : m.colour,
                }}>
                {m.label}
              </button>
            ))}
          </div>
          <button onClick={addEvent}
            style={{ ...S.solidBtn, background: viewer.colour, width: "100%", marginTop: 12 }}>
            Add to calendar
          </button>
        </Card>
      )}

      <Card title={picked
        ? new Date(picked + "T00:00:00").toLocaleDateString("en-AU",
            { weekday: "long", day: "numeric", month: "long" })
        : "Upcoming"}>
        {dayList.length === 0 ? (
          <Empty>Nothing on.</Empty>
        ) : (
          dayList.map((e) => {
            const c = byLabel(e.who).colour;
            const label = picked
              ? (e.event_time || "—")
              : new Date(e.event_date + "T00:00:00").toLocaleDateString("en-AU",
                  { day: "numeric", month: "short" }) + (e.event_time ? ` · ${e.event_time}` : "");
            return (
              <div key={e.id} style={S.row}>
                <span style={S.time}>{label}</span>
                <span style={{ flex: 1 }}>{e.title}</span>
                <span style={{ ...S.tag, background: c }}>{e.who}</span>
                <button onClick={() => removeEvent(e)} style={S.x}>×</button>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}

// ── Realtime change helper ────────────────────────────────────────────────
function applyChange(cur, payload) {
  if (payload.eventType === "INSERT")
    return [payload.new, ...cur.filter((x) => x.id !== payload.new.id)];
  if (payload.eventType === "UPDATE")
    return cur.map((x) => (x.id === payload.new.id ? payload.new : x));
  if (payload.eventType === "DELETE")
    return cur.filter((x) => x.id !== payload.old.id);
  return cur;
}

// ── Shared UI bits ────────────────────────────────────────────────────────
function Shell({ children }) { return <div style={S.shell}>{children}</div>; }
function Card({ title, children }) {
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>{title}</div>
      {children}
    </div>
  );
}
function Empty({ children }) { return <div style={S.empty}>{children}</div>; }

// ── Styles — cool, relaxed palette ───────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Outfit:wght@400;500;600&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; background: #eef2ef; }
  @keyframes fadeUp { from {opacity:0; transform:translateY(6px);} to {opacity:1; transform:none;} }
  .fadeUp { animation: fadeUp .3s ease both; }
  input { font-family: 'Outfit', sans-serif; }
  ::placeholder { color: #a8b4b6; }
`;
const S = {
  shell: {
    fontFamily: "'Outfit', system-ui, sans-serif",
    background: "linear-gradient(180deg, #eef2ef 0%, #e3ebec 100%)",
    color: "#3a4a4a", minHeight: "100vh", maxWidth: 520, margin: "0 auto",
    display: "flex", flexDirection: "column",
  },
  center: { padding: 60, textAlign: "center", color: "#5b8a8a" },
  authWrap: { padding: "60px 24px" },
  authSub: { fontSize: 15, color: "#5e7174", lineHeight: 1.5, marginBottom: 20 },
  authMsg: {
    marginTop: 12, fontSize: 13.5, color: "#2d4548",
    background: "#fff", padding: "10px 12px", borderRadius: 10,
    border: "1px solid #d8dee4",
  },
  linkBtn: {
    display: "block", margin: "16px auto 0", border: "none",
    background: "transparent", color: "#5b8a8a", fontSize: 13.5,
    fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
  },
  backBtn: {
    background: "transparent", border: "none", color: "#5b8a8a",
    fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 8,
    padding: "4px 0", fontFamily: "'Outfit', sans-serif",
  },
  idBox: {
    marginTop: 20, background: "#fff", border: "1px solid #d8dee4",
    borderRadius: 12, padding: "12px 14px",
  },
  idLabel: { fontSize: 11.5, color: "#5b8a8a", fontWeight: 600, marginBottom: 6 },
  idCode: { fontSize: 12.5, color: "#2d4548", wordBreak: "break-all" },
  header: {
    padding: "22px 20px 16px", display: "flex",
    justifyContent: "space-between", alignItems: "flex-start",
    background: "#eef2ef", borderBottom: "1px solid #d8dee4",
  },
  kicker: {
    fontSize: 11, letterSpacing: 2, textTransform: "uppercase",
    color: "#5b8a8a", fontWeight: 600,
  },
  h1: {
    fontFamily: "'Fraunces', serif", fontSize: 30, margin: "2px 0 0",
    fontWeight: 600, color: "#2d4548",
  },
  youDot: {
    width: 32, height: 32, borderRadius: 99, color: "#fff",
    fontSize: 14, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  signOut: {
    border: "1px solid #d8dee4", background: "#fff", borderRadius: 99,
    padding: "6px 12px", fontSize: 12.5, color: "#5e7174", cursor: "pointer",
    fontFamily: "'Outfit', sans-serif",
  },
  tabs: {
    display: "flex", gap: 4, padding: "10px 12px", background: "#eef2ef",
    borderBottom: "1px solid #d8dee4", position: "sticky", top: 0, zIndex: 5,
  },
  tab: {
    flex: 1, padding: "9px 4px", border: "none", background: "transparent",
    borderRadius: 10, fontSize: 13.5, fontWeight: 600, color: "#8a9a9c",
    fontFamily: "'Outfit', sans-serif", cursor: "pointer",
  },
  tabActive: { color: "#fff" },
  main: { padding: "16px 16px 8px", flex: 1 },
  footer: { padding: "12px 16px 20px", fontSize: 11, color: "#a8b4b6", textAlign: "center" },

  listSwitchBtn: {
    width: "100%", padding: "12px 14px", border: "1.5px solid", background: "#fff",
    borderRadius: 12, fontSize: 15, fontWeight: 600,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 12, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
  },
  switchHint: { fontSize: 12, opacity: 0.7 },

  listRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "12px 14px", border: "1px solid #d8dee4",
    background: "#fff", borderRadius: 12, marginBottom: 6,
  },
  listIcon: {
    width: 36, height: 36, borderRadius: 9, background: "#eef2ef",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
  },
  listName: { fontSize: 15, fontWeight: 600, color: "#2d4548" },
  listMeta: { fontSize: 11.5, color: "#8a9a9c", marginTop: 2 },
  activeDot: { width: 8, height: 8, borderRadius: 99 },
  newListBtn: {
    marginTop: 8, width: "100%", padding: "12px", border: "1.5px dashed",
    background: "transparent", borderRadius: 12, fontSize: 14, fontWeight: 600,
    cursor: "pointer", fontFamily: "'Outfit', sans-serif",
  },
  iconLabel: { fontSize: 11, color: "#8a9a9c", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  iconGrid: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 },
  iconCell: {
    aspectRatio: "1", border: "1.5px solid #d8dee4", background: "#fff",
    borderRadius: 9, fontSize: 18, cursor: "pointer", padding: 0,
  },

  card: {
    background: "#fff", borderRadius: 14, padding: "14px 16px",
    marginBottom: 12, border: "1px solid #d8dee4",
  },
  cardTitle: {
    fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase",
    color: "#5b8a8a", marginBottom: 8,
  },
  row: {
    display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
    borderTop: "1px solid #eef2ef", fontSize: 15,
  },
  time: { fontSize: 13, fontWeight: 600, color: "#5b8a8a", minWidth: 52, flexShrink: 0 },
  tag: { fontSize: 11, fontWeight: 600, color: "#fff", padding: "3px 8px", borderRadius: 99 },
  empty: { fontSize: 14, color: "#a8b4b6", padding: "6px 0" },

  addRow: { display: "flex", gap: 8, marginBottom: 12 },
  input: {
    flex: 1, padding: "11px 12px", borderRadius: 11, border: "1px solid #d8dee4",
    fontSize: 15, background: "#fff", outline: "none", color: "#3a4a4a",
    width: "100%",
  },
  solidBtn: {
    padding: "11px 18px", borderRadius: 11, border: "none",
    color: "#fff", fontWeight: 600, fontSize: 14,
    fontFamily: "'Outfit', sans-serif", cursor: "pointer",
  },
  ghostBtn: {
    width: "100%", padding: "10px", borderRadius: 11, border: "1px dashed #c8d0d4",
    background: "transparent", color: "#8a9a9c", fontSize: 13, fontWeight: 600,
    fontFamily: "'Outfit', sans-serif", cursor: "pointer", marginTop: 8,
  },
  check: {
    width: 22, height: 22, borderRadius: 7, border: "2px solid #c8d0d4",
    background: "#fff", color: "#fff", fontSize: 13, cursor: "pointer",
    flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
  },
  checkOn: { background: "#7a9d7e", borderColor: "#7a9d7e" },
  x: {
    border: "none", background: "transparent", color: "#b8c4c6", fontSize: 20,
    cursor: "pointer", lineHeight: 1, padding: "0 6px",
  },
  whoBtn: {
    padding: "8px 14px", borderRadius: 99, border: "1.5px solid", fontSize: 13,
    fontWeight: 600, fontFamily: "'Outfit', sans-serif", cursor: "pointer",
  },

  // Calendar
  calNav: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "4px 4px 12px",
  },
  calArrow: {
    width: 36, height: 36, borderRadius: 99, border: "1px solid #d8dee4",
    background: "#fff", fontSize: 18, fontWeight: 700, color: "#5b8a8a",
    cursor: "pointer", padding: 0, lineHeight: 1,
  },
  calTitle: {
    fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600,
    color: "#2d4548", textAlign: "center",
  },
  calTodayBtn: {
    display: "block", margin: "2px auto 0", background: "transparent",
    border: "none", color: "#5b8a8a", fontSize: 11, fontWeight: 600,
    cursor: "pointer", fontFamily: "'Outfit', sans-serif",
  },
  calDow: {
    display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6,
  },
  dowCell: {
    fontSize: 10, fontWeight: 700, color: "#8a9a9c",
    textAlign: "center", padding: "4px 0",
  },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 },
  calCell: {
    aspectRatio: "1", border: "1px solid transparent", background: "#fff",
    borderRadius: 9, padding: "5px 4px 4px", cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
  },
  calCellEmpty: { aspectRatio: "1", background: "transparent" },
  calCellToday: { color: "#fff" },
  calCellPicked: { borderWidth: 2 },
  dotRow: { display: "flex", gap: 2, marginBottom: 2 },
  calDot: { width: 4, height: 4, borderRadius: 99 },
};
