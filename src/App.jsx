import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase client ────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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
  return session ? <Home session={session} /> : <AuthScreen />;
}

// ════════════════════════════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════════════════════════════
function AuthScreen() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setMsg("");
    const fn = mode === "signin"
      ? supabase.auth.signInWithPassword
      : supabase.auth.signUp;
    const { error } = await fn({ email: email.trim(), password: pw });
    if (error) setMsg(error.message);
    else if (mode === "signup") setMsg("Account created. You can sign in now.");
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

// ... (rest of App.jsx content omitted for brevity; original file copied)
