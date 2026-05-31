import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Outlet, useLocation } from "react-router-dom";
import ConnectionBanner from "../ConnectionBanner";
import { useResidentApp } from "../../context/ResidentAppContext";
import ResidentNav from "./ResidentNav";

function PackageAlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-9 w-9" aria-hidden="true">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
    </svg>
  );
}

const ROUTE_TITLES = {
  "/home": "Deliveries",
  "/visitors": "Visitors",
  "/notifications": "Alerts",
  "/chat": "Chat",
};

export default function ResidentLayout() {
  const {
    connected,
    unit,
    residentName,
    incomingDeliveryPrompt,
    deliveryPromptBusy,
    dismissIncomingDeliveryPrompt,
    handleIncomingDeliveryPromptAction,
    preregistrations,
    instructions,
    emergencyAlert,
    dismissEmergencyAlert,
    logout,
  } = useResidentApp();
  const alertAudioContextRef = useRef(null);
  const location = useLocation();

  const screenTitle = (() => {
    for (const [path, title] of Object.entries(ROUTE_TITLES)) {
      if (location.pathname.startsWith(path)) return title;
    }
    return "Resident";
  })();

  useEffect(() => {
    if (!incomingDeliveryPrompt) {
      if (alertAudioContextRef.current) {
        alertAudioContextRef.current.close().catch(() => {});
        alertAudioContextRef.current = null;
      }
      return undefined;
    }

    let stopped = false;
    let toneTimer = null;
    let vibrateTimer = null;

    function beepOnce() {
      if (stopped) return;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!alertAudioContextRef.current) {
        alertAudioContextRef.current = new AudioContextClass();
      }
      const ctx = alertAudioContextRef.current;
      if (!ctx) return;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.25);
    }

    beepOnce();
    toneTimer = setInterval(beepOnce, 1300);

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([200, 120, 200]);
      vibrateTimer = setInterval(() => {
        if (!stopped) navigator.vibrate([200, 120, 200]);
      }, 1400);
    }

    return () => {
      stopped = true;
      if (toneTimer) clearInterval(toneTimer);
      if (vibrateTimer) clearInterval(vibrateTimer);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(0);
    };
  }, [incomingDeliveryPrompt]);

  async function handlePromptAction(action) {
    try {
      await handleIncomingDeliveryPromptAction(action);
    } catch (error) {
      alert(error?.message || "Unable to process request. Try again.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-[calc(env(safe-area-inset-bottom)+4.5rem)] md:pb-0">
      <div className="mx-auto w-full max-w-lg md:max-w-7xl">
        {/* Top header */}
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <span className="text-base font-bold text-zinc-900">{screenTitle}</span>
            </div>
            <div className="flex items-center gap-2">
              {connected && (
                <span className="flex h-2 w-2 rounded-full bg-emerald-500" title="Connected" aria-label="Connected" />
              )}
              {residentName && (
                <span className="hidden text-sm font-semibold text-zinc-700 sm:inline">{residentName}</span>
              )}
              <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                {unit}
              </span>
              <button
                type="button"
                onClick={() => { if (confirm("Sign out?")) logout(); }}
                title="Sign out"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-rose-500"
                aria-label="Sign out"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>
          {/* Desktop nav */}
          <div className="hidden border-t border-zinc-100 px-4 py-2 md:block">
            <ResidentNav />
          </div>
        </header>

        <div className="px-4 pt-4">
          <ConnectionBanner connected={connected} />
        </div>

        <main className="px-4 pb-6 pt-2">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav is rendered by ResidentNav via portal */}

      {/* Incoming delivery alert overlay */}
      {incomingDeliveryPrompt && (() => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const visitorName = incomingDeliveryPrompt.delivery_person_name || "";
        const preRegMatch = preregistrations.find(
          (r) => r.expected_date === todayStr &&
            visitorName.toLowerCase().includes((r.visitor_name || "").toLowerCase()) ||
            (r.visitor_name || "").toLowerCase().includes(visitorName.toLowerCase())
        );
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm md:items-center md:p-4" aria-modal="true" role="dialog" aria-label="Incoming Delivery Request">
            <section className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl md:rounded-3xl">
              {/* Alert top strip */}
              <div className="flex items-center gap-2 bg-rose-600 px-5 py-3">
                <span className="animate-pulse text-white">
                  <PackageAlertIcon />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-rose-100">Incoming Delivery</p>
                  <p className="text-xs text-rose-200">
                    {new Date(incomingDeliveryPrompt.created_at || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>

              <div className="px-5 py-5 space-y-4">
                {/* Person avatar + details */}
                <div className="flex items-center gap-4">
                  {incomingDeliveryPrompt.parcel_image ? (
                    <img
                      src={incomingDeliveryPrompt.parcel_image}
                      alt="Visitor at gate"
                      className="h-16 w-16 shrink-0 rounded-2xl object-cover border-2 border-indigo-200 shadow-sm"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-bold text-indigo-700">
                      {(incomingDeliveryPrompt.delivery_person_name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 leading-tight">
                      {incomingDeliveryPrompt.delivery_person_name || "Unknown Visitor"}
                    </h2>
                    <p className="text-sm text-zinc-500">{incomingDeliveryPrompt.company || "Unknown company"}</p>
                  </div>
                </div>

                {/* Pre-reg match badge */}
                {preRegMatch && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <p className="text-xs font-semibold text-emerald-800">Pre-registered visitor expected today</p>
                  </div>
                )}

                {/* Instructions */}
                {instructions && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-0.5">Your delivery instructions</p>
                    <p className="text-sm text-amber-900">{instructions}</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-200 transition active:scale-[0.97] disabled:opacity-60"
                    disabled={deliveryPromptBusy}
                    onClick={() => handlePromptAction("approve")}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Approve
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 rounded-2xl bg-rose-600 py-3.5 text-sm font-bold text-white shadow-md shadow-rose-200 transition active:scale-[0.97] disabled:opacity-60"
                    disabled={deliveryPromptBusy}
                    onClick={() => handlePromptAction("reject")}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    Reject
                  </button>
                </div>

                {/* Dismiss link */}
                <div className="text-center">
                  <button
                    type="button"
                    className="text-xs font-medium text-zinc-400 underline-offset-2 hover:underline disabled:opacity-50"
                    disabled={deliveryPromptBusy}
                    onClick={dismissIncomingDeliveryPrompt}
                  >
                    Dismiss — decide later in Deliveries
                  </button>
                </div>
              </div>
            </section>
          </div>
        );
      })()}

      {/* Emergency alert full-screen overlay — rendered via portal to escape stacking contexts */}
      {emergencyAlert && createPortal(
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-rose-700/95 px-6" role="alertdialog" aria-modal="true" aria-label="Emergency Alert">
          <div className="w-full max-w-sm text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-9 w-9" aria-hidden="true">
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-200">Emergency Broadcast</p>
              <h2 className="mt-1 text-2xl font-extrabold text-white leading-tight">{emergencyAlert.message || "Emergency Alert"}</h2>
              {emergencyAlert.from && (
                <p className="mt-1 text-sm text-rose-200">From: {emergencyAlert.from}</p>
              )}
              <p className="mt-1 text-xs text-rose-300">
                {new Date(emergencyAlert.timestamp || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <button
              type="button"
              className="mt-2 w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-rose-700 shadow-lg active:scale-[0.97] transition"
              onClick={dismissEmergencyAlert}
            >
              Dismiss
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
