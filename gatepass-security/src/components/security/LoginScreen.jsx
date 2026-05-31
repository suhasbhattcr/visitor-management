import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4001";

export const SECURITY_AUTH_KEY = "security_auth";

export default function LoginScreen({ onLogin }) {
  const [officers, setOfficers] = useState([]);
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRoster, setShowRoster] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/users/security`)
      .then((r) => r.json())
      .then((d) => setOfficers(d.officers || []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const id = username.trim().toLowerCase();
    if (!id || !pin.trim()) {
      setError("Please enter your User ID and PIN.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/users/login/security`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, pin: pin.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid User ID or PIN");
      localStorage.setItem(SECURITY_AUTH_KEY, JSON.stringify(data));
      onLogin(data);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Gate Console</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in with your User ID and PIN</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="sec-username" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              User ID
            </label>
            <input
              id="sec-username"
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              placeholder="e.g. security1"
              autoComplete="username"
              autoFocus
              className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none ring-1 ring-slate-700 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="sec-pin" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              PIN
            </label>
            <input
              id="sec-pin"
              type="password"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(""); }}
              placeholder="••••"
              autoComplete="current-password"
              maxLength={4}
              className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none ring-1 ring-slate-700 focus:ring-emerald-500"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-rose-500/20 px-3 py-2.5 text-xs font-semibold text-rose-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "Signing in\u2026" : "Sign In"}
          </button>
        </form>

        {/* Officer roster (collapsible quick-fill) */}
        <div className="mt-4 rounded-xl bg-slate-800 p-3">
          <button
            type="button"
            onClick={() => setShowRoster((v) => !v)}
            className="flex w-full items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500"
          >
            <span>Officer Roster</span>
            <span>{showRoster ? "▲" : "▼"}</span>
          </button>
          {showRoster && officers.length > 0 && (
            <div className="mt-2 space-y-1">
              {officers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setUsername(p.id); setShowRoster(false); }}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs transition hover:bg-slate-700"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
                    {(p.first_name?.[0] || p.name?.[0] || "?").toUpperCase()}
                  </span>
                  <span className="flex-1 text-left">
                    <span className="block font-semibold text-slate-200">{p.first_name} {p.last_name}</span>
                    <span className="text-slate-500">{p.gate}</span>
                  </span>
                  <span className="font-mono text-slate-500">{p.id}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

