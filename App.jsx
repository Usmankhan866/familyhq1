import React, { useState, useEffect } from "react";

const FAMILY = [
  { label: "Antoine", colour: "#5b8a8a" },
  { label: "Beronia", colour: "#7a8fb8" },
  { label: "Joseph",  colour: "#a78b6a" },
  { label: "Thomas",  colour: "#8aa67e" },
];
const byLabel = (l) => FAMILY.find((f) => f.label === l) || FAMILY[0];
const ICONS = ["📋","🛒","✓","✈️","🔨","🎂","🎄","🏠","🏥","🐕","🎒","💼","🍳","📚","🎁","🎉"];

const todayISO = () => new Date().toISOString().slice(0, 10);
const monthName = (m) =>
  ["January","February","March","April","May","June",
   "July","August","September","October","November","December"][m];

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function useLocalStorage(key, defaultVal) {
  const [val, setVal] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultVal;
    } catch {
      return defaultVal;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(val));
  }, [key, val]);
  return [val, setVal];
}

const DEFAULT_LISTS = [
  { id: "builtin-1", name: "Shopping", icon: "🛒", position: 0, is_builtin: true },
  { id: "builtin-2", name: "To-Do",    icon: "✓",  position: 1, is_builtin: true },
];

// ════════════════════════════════════════════════════════════════════════
//  ROOT
// ════════════════════════════════════════════════════════════════════════
export default function App() {
  const [viewer, setViewer] = useLocalStorage("fhq_viewer", null);
  if (!viewer) return <WhoScreen onPick={setViewer} />;
  return <Home viewer={byLabel(viewer)} onSwitch={() => setViewer(null)} />;
}

// ════════════════════════════════════════════════════════════════════════
//  WHO SCREEN
// ════════════════════════════════════════════════════════════════════════
function WhoScreen({ onPick }) {
  return (
    <Shell>
      <style>{CSS}</style>
      <div style={S.authWrap}>
        <div style={S.kicker}>Family Command Centre</div>
        <h1 style={S.h1}>Family HQ</h1>
        <p style={S.authSub}>Who are you?</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FAMILY.map((f) => (
            <button
              key={f.label}
              style={{ ...S.solidBtn, background: f.colour, width: "100%", fontSize: 16 }}
              onClick={() => onPick(f.label)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </Shell>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  HOME
// ════════════════════════════════════════════════════════════════════════
function Home({ viewer, onSwitch }) {
  const [tab, setTab] = useState("Lists");
  return (
    <Shell>
      <style>{CSS}</style>
      <header style={S.header}>
        <div>
          <div style={S.kicker}>Family Command Centre</div>
          <h1 style={S.h1}>Family HQ</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ ...S.youDot, background: viewer.colour }}>{viewer.label[0]}</div>
          <button style={S.signOut} onClick={onSwitch}>Switch</button>
        </div>
      </header>
      <nav style={S.tabs}>
        {["Lists", "Calendar"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ ...S.tab, ...(tab === t ? { ...S.tabActive, background: viewer.colour } : {}) }}
          >
            {t}
          </button>
        ))}
      </nav>
      <main style={S.main}>
        {tab === "Lists"    && <Lists    viewer={viewer} />}
        {tab === "Calendar" && <Calendar viewer={viewer} />}
      </main>
      <footer style={S.footer}>Family HQ · {viewer.label}</footer>
    </Shell>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  LISTS
// ════════════════════════════════════════════════════════════════════════
function Lists({ viewer }) {
  const [lists, setLists]   = useLocalStorage("fhq_lists", DEFAULT_LISTS);
  const [items, setItems]   = useLocalStorage("fhq_items", []);
  const [activeId, setActiveId] = useState(lists[0]?.id || DEFAULT_LISTS[0].id);
  const [view, setView]     = useState("items");
  const [text, setText]     = useState("");
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📋");

  const activeList  = lists.find((l) => l.id === activeId);
  const activeItems = items.filter((i) => i.list_id === activeId);

  const addItem = () => {
    if (!text.trim() || !activeId) return;
    setItems([...items, { id: uid(), list_id: activeId, text: text.trim(), done: false, created_by: viewer.label }]);
    setText("");
  };

  const toggleItem = (item) =>
    setItems(items.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)));

  const deleteItem = (item) =>
    setItems(items.filter((i) => i.id !== item.id));

  const clearDone = () =>
    setItems(items.filter((i) => !(i.list_id === activeId && i.done)));

  const createList = (name, icon) => {
    const newList = { id: uid(), name, icon, position: lists.length, is_builtin: false };
    setLists([...lists, newList]);
    setActiveId(newList.id);
    setNewName("");
    setNewIcon("📋");
    setView("items");
  };

  const deleteList = (list) => {
    if (!confirm(`Delete the "${list.name}" list and all its items?`)) return;
    const remaining = lists.filter((l) => l.id !== list.id);
    setLists(remaining);
    setItems(items.filter((i) => i.list_id !== list.id));
    setActiveId(remaining[0]?.id || null);
  };

  if (view === "switcher")
    return (
      <ListSwitcher
        lists={lists}
        items={items}
        activeListId={activeId}
        accent={viewer.colour}
        onPick={(id) => { setActiveId(id); setView("items"); }}
        onNew={() => setView("new")}
        onDelete={deleteList}
        onBack={() => setView("items")}
      />
    );

  if (view === "new")
    return (
      <NewList
        accent={viewer.colour}
        name={newName}
        icon={newIcon}
        onName={setNewName}
        onIcon={setNewIcon}
        onCancel={() => setView("switcher")}
        onCreate={() => newName.trim() && createList(newName.trim(), newIcon)}
      />
    );

  return (
    <div className="fadeUp">
      <button onClick={() => setView("switcher")} style={{ ...S.listSwitchBtn, color: viewer.colour, borderColor: viewer.colour }}>
        <span>{activeList?.icon} {activeList?.name || "Loading…"}</span>
        <span style={S.switchHint}>Switch list ›</span>
      </button>
      <div style={S.addRow}>
        <input
          style={S.input}
          placeholder={`Add to ${activeList?.name || "list"}…`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
        />
        <button style={{ ...S.solidBtn, background: viewer.colour }} onClick={addItem}>Add</button>
      </div>
      <Card title={`${activeItems.length} items`}>
        {activeItems.length === 0 ? (
          <Empty>List is empty.</Empty>
        ) : (
          activeItems.map((item) => {
            const creator = byLabel(item.created_by);
            return (
              <div key={item.id} style={S.row}>
                <button onClick={() => toggleItem(item)} style={{ ...S.check, ...(item.done ? S.checkOn : {}) }}>
                  {item.done ? "✓" : ""}
                </button>
                <span style={{ flex: 1, textDecoration: item.done ? "line-through" : "none", color: item.done ? "#a8a89e" : "inherit" }}>
                  {item.text}
                </span>
                <span style={{ ...S.tag, background: creator.colour }}>{creator.label}</span>
                <button onClick={() => deleteItem(item)} style={S.x}>×</button>
              </div>
            );
          })
        )}
      </Card>
      {activeItems.some((i) => i.done) && (
        <button style={S.ghostBtn} onClick={clearDone}>Clear completed</button>
      )}
    </div>
  );
}

function ListSwitcher({ lists, items, activeListId, onPick, onNew, onDelete, accent, onBack }) {
  const openCount = lists.reduce((acc, l) => {
    acc[l.id] = items.filter((i) => i.list_id === l.id && !i.done).length;
    return acc;
  }, {});
  return (
    <div className="fadeUp">
      <button onClick={onBack} style={S.backBtn}>‹ Back</button>
      <div style={{ ...S.cardTitle, marginBottom: 8 }}>Your lists</div>
      {lists.map((l) => (
        <div key={l.id} style={{ ...S.listRow, ...(l.id === activeListId ? { borderColor: accent, background: "#fbfdfb" } : {}) }}>
          <div onClick={() => onPick(l.id)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <div style={S.listIcon}>{l.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={S.listName}>{l.name}</div>
              <div style={S.listMeta}>
                {openCount[l.id] === 0 ? "All done" : `${openCount[l.id]} open`}
                {l.is_builtin ? "" : " · custom"}
              </div>
            </div>
            {l.id === activeListId && <span style={{ ...S.activeDot, background: accent }} />}
          </div>
          {!l.is_builtin && <button onClick={() => onDelete(l)} style={S.x}>×</button>}
        </div>
      ))}
      <button onClick={onNew} style={{ ...S.newListBtn, color: accent, borderColor: accent }}>+ New list</button>
    </div>
  );
}

function NewList({ accent, name, icon, onName, onIcon, onCancel, onCreate }) {
  return (
    <div className="fadeUp">
      <button onClick={onCancel} style={S.backBtn}>‹ Back</button>
      <div style={{ ...S.cardTitle, marginBottom: 8 }}>New list</div>
      <input
        value={name}
        onChange={(e) => onName(e.target.value)}
        placeholder="What's it for? e.g. Italy holiday, School…"
        style={{ ...S.input, marginBottom: 10 }}
      />
      <div style={S.iconLabel}>Pick an icon</div>
      <div style={S.iconGrid}>
        {ICONS.map((ic) => (
          <button key={ic} onClick={() => onIcon(ic)} style={{ ...S.iconCell, ...(icon === ic ? { borderColor: accent, background: "#fbfdfb" } : {}) }}>
            {ic}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={onCancel} style={{ ...S.ghostBtn, flex: 1, marginTop: 0 }}>Cancel</button>
        <button onClick={onCreate} style={{ ...S.solidBtn, flex: 1, background: accent }}>Create</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  CALENDAR
// ════════════════════════════════════════════════════════════════════════
function Calendar({ viewer }) {
  const [events, setEvents] = useLocalStorage("fhq_events", []);
  const today = new Date();
  const [nav, setNav]       = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState(null);
  const [adding, setAdding]  = useState(false);
  const [form, setForm]      = useState({ title: "", date: todayISO(), time: "", who: viewer.label });

  const firstDow   = (new Date(nav.y, nav.m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(nav.y, nav.m + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = i - firstDow + 1;
    return d >= 1 && d <= daysInMonth ? d : null;
  });

  const isoDate = (d) =>
    `${nav.y}-${String(nav.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const eventsOn  = (d) => events.filter((e) => e.event_date === isoDate(d));
  const goBack    = () => setNav(nav.m === 0  ? { y: nav.y - 1, m: 11 } : { y: nav.y, m: nav.m - 1 });
  const goFwd     = () => setNav(nav.m === 11 ? { y: nav.y + 1, m: 0  } : { y: nav.y, m: nav.m + 1 });
  const jumpToday = () => { setNav({ y: today.getFullYear(), m: today.getMonth() }); setSelected(null); };

  const addEvent = () => {
    if (!form.title.trim()) return;
    const who = byLabel(form.who);
    setEvents([...events, { id: uid(), title: form.title.trim(), event_date: form.date, event_time: form.time || null, who: who.label, colour: who.colour }]);
    setForm({ ...form, title: "", time: "" });
    setAdding(false);
  };

  const deleteEvent = (ev) => setEvents(events.filter((e) => e.id !== ev.id));

  const listed = selected
    ? events
        .filter((e) => e.event_date === selected)
        .sort((a, b) => (a.event_time || "").localeCompare(b.event_time || ""))
    : events
        .filter((e) => e.event_date >= todayStr)
        .sort((a, b) => (a.event_date + (a.event_time || "")).localeCompare(b.event_date + (b.event_time || "")))
        .slice(0, 8);

  return (
    <div className="fadeUp">
      <div style={S.calNav}>
        <button onClick={goBack} style={S.calArrow}>‹</button>
        <div>
          <div style={S.calTitle}>{monthName(nav.m)} {nav.y}</div>
          {(nav.y !== today.getFullYear() || nav.m !== today.getMonth()) && (
            <button onClick={jumpToday} style={S.calTodayBtn}>Jump to today</button>
          )}
        </div>
        <button onClick={goFwd} style={S.calArrow}>›</button>
      </div>
      <div style={S.calDow}>
        {["M","T","W","T","F","S","S"].map((d, i) => <div key={i} style={S.dowCell}>{d}</div>)}
      </div>
      <div style={S.calGrid}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} style={S.calCellEmpty} />;
          const iso     = isoDate(d);
          const isToday = iso === todayStr;
          const isPicked = selected === iso;
          const dots    = eventsOn(d);
          return (
            <button
              key={i}
              onClick={() => setSelected(isPicked ? null : iso)}
              style={{ ...S.calCell, ...(isToday ? { ...S.calCellToday, background: viewer.colour } : {}), ...(isPicked && !isToday ? { ...S.calCellPicked, borderColor: viewer.colour } : {}) }}
            >
              <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: isToday ? "#fff" : "#3a4a4a" }}>{d}</span>
              {dots.length > 0 && (
                <div style={S.dotRow}>
                  {dots.slice(0, 4).map((ev, j) => (
                    <span key={j} style={{ ...S.calDot, background: isToday ? "#fff" : byLabel(ev.who).colour }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <button onClick={() => setAdding(!adding)} style={{ ...S.solidBtn, background: viewer.colour, width: "100%", marginTop: 14 }}>
        {adding ? "Close" : "+ Add event"}
      </button>
      {adding && (
        <Card title="New event">
          <input style={S.input} placeholder="What's happening?" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input style={{ ...S.input, flex: 1 }} type="date" value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <input style={{ ...S.input, width: 110 }} type="time" value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {FAMILY.map((f) => (
              <button key={f.label} onClick={() => setForm({ ...form, who: f.label })}
                style={{ ...S.whoBtn, borderColor: f.colour, background: form.who === f.label ? f.colour : "transparent", color: form.who === f.label ? "#fff" : f.colour }}>
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={addEvent} style={{ ...S.solidBtn, background: viewer.colour, width: "100%", marginTop: 12 }}>
            Add to calendar
          </button>
        </Card>
      )}
      <Card title={selected
        ? new Date(selected + "T00:00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })
        : "Upcoming"
      }>
        {listed.length === 0 ? <Empty>Nothing on.</Empty> : listed.map((ev) => {
          const who   = byLabel(ev.who);
          const label = selected
            ? (ev.event_time || "—")
            : new Date(ev.event_date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" }) + (ev.event_time ? ` · ${ev.event_time}` : "");
          return (
            <div key={ev.id} style={S.row}>
              <span style={S.time}>{label}</span>
              <span style={{ flex: 1 }}>{ev.title}</span>
              <span style={{ ...S.tag, background: who.colour }}>{ev.who}</span>
              <button onClick={() => deleteEvent(ev)} style={S.x}>×</button>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  SHARED UI
// ════════════════════════════════════════════════════════════════════════
function Shell({ children }) { return <div style={S.shell}>{children}</div>; }
function Card({ title, children }) {
  return <div style={S.card}><div style={S.cardTitle}>{title}</div>{children}</div>;
}
function Empty({ children }) { return <div style={S.empty}>{children}</div>; }

// ════════════════════════════════════════════════════════════════════════
//  STYLES
// ════════════════════════════════════════════════════════════════════════
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
  shell:        { fontFamily: "'Outfit', system-ui, sans-serif", background: "linear-gradient(180deg, #eef2ef 0%, #e3ebec 100%)", color: "#3a4a4a", minHeight: "100vh", maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column" },
  center:       { padding: 60, textAlign: "center", color: "#5b8a8a" },
  authWrap:     { padding: "60px 24px" },
  authSub:      { fontSize: 15, color: "#5e7174", lineHeight: 1.5, marginBottom: 20 },
  linkBtn:      { display: "block", margin: "16px auto 0", border: "none", background: "transparent", color: "#5b8a8a", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif" },
  backBtn:      { background: "transparent", border: "none", color: "#5b8a8a", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 8, padding: "4px 0", fontFamily: "'Outfit', sans-serif" },
  header:       { padding: "22px 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: "#eef2ef", borderBottom: "1px solid #d8dee4" },
  kicker:       { fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#5b8a8a", fontWeight: 600 },
  h1:           { fontFamily: "'Fraunces', serif", fontSize: 30, margin: "2px 0 0", fontWeight: 600, color: "#2d4548" },
  youDot:       { width: 32, height: 32, borderRadius: 99, color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" },
  signOut:      { border: "1px solid #d8dee4", background: "#fff", borderRadius: 99, padding: "6px 12px", fontSize: 12.5, color: "#5e7174", cursor: "pointer", fontFamily: "'Outfit', sans-serif" },
  tabs:         { display: "flex", gap: 4, padding: "10px 12px", background: "#eef2ef", borderBottom: "1px solid #d8dee4", position: "sticky", top: 0, zIndex: 5 },
  tab:          { flex: 1, padding: "9px 4px", border: "none", background: "transparent", borderRadius: 10, fontSize: 13.5, fontWeight: 600, color: "#8a9a9c", fontFamily: "'Outfit', sans-serif", cursor: "pointer" },
  tabActive:    { color: "#fff" },
  main:         { padding: "16px 16px 8px", flex: 1 },
  footer:       { padding: "12px 16px 20px", fontSize: 11, color: "#a8b4b6", textAlign: "center" },
  listSwitchBtn:{ width: "100%", padding: "12px 14px", border: "1.5px solid", background: "#fff", borderRadius: 12, fontSize: 15, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, cursor: "pointer", fontFamily: "'Outfit', sans-serif" },
  switchHint:   { fontSize: 12, opacity: 0.7 },
  listRow:      { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", border: "1px solid #d8dee4", background: "#fff", borderRadius: 12, marginBottom: 6 },
  listIcon:     { width: 36, height: 36, borderRadius: 9, background: "#eef2ef", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },
  listName:     { fontSize: 15, fontWeight: 600, color: "#2d4548" },
  listMeta:     { fontSize: 11.5, color: "#8a9a9c", marginTop: 2 },
  activeDot:    { width: 8, height: 8, borderRadius: 99 },
  newListBtn:   { marginTop: 8, width: "100%", padding: "12px", border: "1.5px dashed", background: "transparent", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif" },
  iconLabel:    { fontSize: 11, color: "#8a9a9c", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  iconGrid:     { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 },
  iconCell:     { aspectRatio: "1", border: "1.5px solid #d8dee4", background: "#fff", borderRadius: 9, fontSize: 18, cursor: "pointer", padding: 0 },
  card:         { background: "#fff", borderRadius: 14, padding: "14px 16px", marginBottom: 12, border: "1px solid #d8dee4" },
  cardTitle:    { fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: "#5b8a8a", marginBottom: 8 },
  row:          { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid #eef2ef", fontSize: 15 },
  time:         { fontSize: 13, fontWeight: 600, color: "#5b8a8a", minWidth: 52, flexShrink: 0 },
  tag:          { fontSize: 11, fontWeight: 600, color: "#fff", padding: "3px 8px", borderRadius: 99 },
  empty:        { fontSize: 14, color: "#a8b4b6", padding: "6px 0" },
  addRow:       { display: "flex", gap: 8, marginBottom: 12 },
  input:        { flex: 1, padding: "11px 12px", borderRadius: 11, border: "1px solid #d8dee4", fontSize: 15, background: "#fff", outline: "none", color: "#3a4a4a", width: "100%" },
  solidBtn:     { padding: "11px 18px", borderRadius: 11, border: "none", color: "#fff", fontWeight: 600, fontSize: 14, fontFamily: "'Outfit', sans-serif", cursor: "pointer" },
  ghostBtn:     { width: "100%", padding: "10px", borderRadius: 11, border: "1px dashed #c8d0d4", background: "transparent", color: "#8a9a9c", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif", cursor: "pointer", marginTop: 8 },
  check:        { width: 22, height: 22, borderRadius: 7, border: "2px solid #c8d0d4", background: "#fff", color: "#fff", fontSize: 13, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  checkOn:      { background: "#7a9d7e", borderColor: "#7a9d7e" },
  x:            { border: "none", background: "transparent", color: "#b8c4c6", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "0 6px" },
  whoBtn:       { padding: "8px 14px", borderRadius: 99, border: "1.5px solid", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif", cursor: "pointer" },
  calNav:       { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 4px 12px" },
  calArrow:     { width: 36, height: 36, borderRadius: 99, border: "1px solid #d8dee4", background: "#fff", fontSize: 18, fontWeight: 700, color: "#5b8a8a", cursor: "pointer", padding: 0, lineHeight: 1 },
  calTitle:     { fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, color: "#2d4548", textAlign: "center" },
  calTodayBtn:  { display: "block", margin: "2px auto 0", background: "transparent", border: "none", color: "#5b8a8a", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif" },
  calDow:       { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 },
  dowCell:      { fontSize: 10, fontWeight: 700, color: "#8a9a9c", textAlign: "center", padding: "4px 0" },
  calGrid:      { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 },
  calCell:      { aspectRatio: "1", border: "1px solid transparent", background: "#fff", borderRadius: 9, padding: "5px 4px 4px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between" },
  calCellEmpty: { aspectRatio: "1", background: "transparent" },
  calCellToday: { color: "#fff" },
  calCellPicked:{ borderWidth: 2 },
  dotRow:       { display: "flex", gap: 2, marginBottom: 2 },
  calDot:       { width: 4, height: 4, borderRadius: 99 },
};
