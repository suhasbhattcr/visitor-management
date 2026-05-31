import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { createPortal } from "react-dom";
import ConnectionBanner from "../ConnectionBanner";
import { useSecurityApp } from "../../context/SecurityAppContext";

const NAV_ITEMS = [
  {
    to: "/home",
    label: "Home",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    to: "/notifications",
    label: "Alerts",
    badge: "notifications",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    to: "/chat",
    label: "Chat",
    badge: "chat",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    to: "/create",
    label: "Log Entry",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    to: "/live",
    label: "Live Status",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
];

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
    <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

function EmergencyButton({ onSend, compact = false }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");

  function handleSend() {
    onSend(msg || "Emergency — all residents please stay alert.");
    setOpen(false);
    setMsg("");
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Emergency Alert"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white transition hover:bg-rose-500 active:scale-[0.97]"
        >
          <AlertIcon />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-rose-500 active:scale-[0.97] transition"
        >
          <AlertIcon />
          Emergency Alert
        </button>
      )}

      {open && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                  <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                  <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h2 className="font-bold text-zinc-900">Broadcast Emergency Alert</h2>
            </div>
            <p className="mb-3 text-xs text-zinc-500">This will send an alert to ALL residents immediately.</p>
            <textarea
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-800 outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
              rows={3}
              placeholder="Emergency message (optional)..."
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-zinc-200 py-2.5 text-sm font-semibold text-zinc-600">Cancel</button>
              <button type="button" onClick={handleSend} className="rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white hover:bg-rose-500">Send Alert</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default function SecurityLayout() {
  const { connected, persona, gate, officerName, unreadChatCount, unreadNotificationsCount, emergencyBroadcast, logout } = useSecurityApp();

  const mobileNav = (
    <nav className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 md:hidden">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-1 rounded-3xl border border-zinc-200 bg-white/96 p-1.5 shadow-xl backdrop-blur">
        {NAV_ITEMS.map((item) => {
          const badge = item.badge === "chat" ? unreadChatCount : item.badge === "notifications" ? unreadNotificationsCount : 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-semibold transition-transform duration-150 active:scale-[0.98] ${isActive ? "bg-slate-900 text-white" : "text-zinc-600"}`
              }
            >
              {item.icon}
              {item.label}
              {badge > 0 && (
                <span className="absolute right-1 top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold leading-4 text-white">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-zinc-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-slate-900 md:flex">
        {/* Brand */}
        <div className="border-b border-slate-700/60 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Security</p>
              <p className="text-sm font-bold text-white leading-tight">Gate Console</p>
            </div>
          </div>

          {/* Gate identity badge */}
          <div className="mt-3 rounded-xl bg-slate-800 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">{gate}</p>
              {persona?.badge && (
                <span className="rounded-md bg-slate-700 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400">{persona.badge}</span>
              )}
            </div>
            <p className="mt-0.5 text-sm font-semibold text-white leading-tight">{officerName || "Officer"}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Navigation</p>
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const badge = item.badge === "chat" ? unreadChatCount : item.badge === "notifications" ? unreadNotificationsCount : 0;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  {item.icon}
                  {item.label}
                  {badge > 0 && (
                    <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-5 text-white">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-700/60 p-4 space-y-3">
          <EmergencyButton onSend={emergencyBroadcast} />
          <div className="flex items-center justify-between">
            <span className={`flex items-center gap-1.5 text-xs font-medium ${connected ? "text-emerald-400" : "text-rose-400"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-rose-400"}`} />
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => { if (confirm("Sign out?")) logout(); }}
            className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-rose-500 hover:text-rose-400 hover:bg-slate-800 transition"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-h-screen flex-1 flex-col md:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur-md md:hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{gate || "Gate Console"}</p>
              <p className="text-sm font-bold text-zinc-900">{officerName || "Security"}{persona?.badge ? <span className="ml-1.5 font-mono text-xs font-medium text-zinc-400">{persona.badge}</span> : null}</p>
            </div>
            <div className="flex items-center gap-2">
              <EmergencyButton onSend={emergencyBroadcast} compact />
              <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-rose-500"}`} title={connected ? "Connected" : "Disconnected"} />
              <button
                type="button"
                onClick={() => { if (confirm("Sign out?")) logout(); }}
                title="Sign out"
                aria-label="Sign out"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-rose-500"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Desktop page header */}
        <div className="hidden border-b border-zinc-200 bg-white px-6 py-3 md:flex md:items-center md:justify-between">
          <ConnectionBanner connected={connected} />
          <div className="flex items-center gap-3">
            <EmergencyButton onSend={emergencyBroadcast} />
          </div>
        </div>

        <main className="flex-1 p-4 pb-28 md:p-6 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav via portal */}
      {typeof document !== "undefined" ? createPortal(mobileNav, document.body) : null}
    </div>
  );
}
