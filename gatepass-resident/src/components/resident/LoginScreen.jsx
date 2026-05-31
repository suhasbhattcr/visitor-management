import { useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4001";

export const RESIDENT_AUTH_KEY = "resident_auth";

export default function LoginScreen({ onLogin }) {
  const [userId, setUserId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRef, setShowRef] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const id = userId.trim().toLowerCase();
    if (!id || !pin.trim()) {
      setError("Please enter your User ID and PIN.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/users/login/resident`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, pin: pin.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid User ID or PIN");
      localStorage.setItem(RESIDENT_AUTH_KEY, JSON.stringify(data));
      onLogin(data);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100 px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Resident Portal</h1>
          <p className="mt-1 text-sm text-zinc-500">Sign in with your User ID and PIN</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div>
            <label htmlFor="res-userid" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              User ID
            </label>
            <input
              id="res-userid"
              type="text"
              value={userId}
              onChange={(e) => { setUserId(e.target.value); setError(""); }}
              placeholder="e.g. a10101"
              autoComplete="username"
              autoFocus
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="res-pin" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              PIN
            </label>
            <input
              id="res-pin"
              type="password"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(""); }}
              placeholder="••••"
              autoComplete="current-password"
              maxLength={4}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "Signing in\u2026" : "Sign In"}
          </button>
        </form>

        {/* ID format hint */}
        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <button
            type="button"
            onClick={() => setShowRef((v) => !v)}
            className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-500"
          >
            <span>User ID Format</span>
            <span className="text-zinc-400">{showRef ? "\u25b2" : "\u25bc"}</span>
          </button>
          {showRef && (
            <div className="mt-3 space-y-2 text-xs text-zinc-600">
              <p>Your User ID is your <span className="font-semibold text-zinc-800">flat code + 2-digit sequence</span>.</p>
              <div className="rounded-lg bg-zinc-50 p-3 font-mono text-zinc-700">
                <p>Flat A101, resident 1 &rarr; <span className="font-bold text-indigo-600">a10101</span></p>
                <p>Flat A101, resident 2 &rarr; <span className="font-bold text-indigo-600">a10102</span></p>
                <p>Flat B201, resident 1 &rarr; <span className="font-bold text-indigo-600">b20101</span></p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
