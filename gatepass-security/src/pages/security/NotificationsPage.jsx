import { useMemo } from "react";
import { useSecurityApp } from "../../context/SecurityAppContext";

function relativeTime(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const CATEGORY_META = {
  emergency: { label: "Emergency", bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-300", dot: "bg-rose-500" },
  delivery: { label: "Delivery", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100", dot: "bg-blue-500" },
  chat: { label: "Chat", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-100", dot: "bg-indigo-500" },
};

function meta(category) {
  return CATEGORY_META[category] || { label: category || "Alert", bg: "bg-zinc-50", text: "text-zinc-700", border: "border-zinc-200", dot: "bg-zinc-400" };
}

export default function NotificationsPage() {
  const { notifications, clearNotifications } = useSecurityApp();

  const emergencies = useMemo(() => notifications.filter((n) => n.category === "emergency"), [notifications]);
  const rest = useMemo(() => notifications.filter((n) => n.category !== "emergency"), [notifications]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Activity Feed</h1>
          <p className="text-xs text-zinc-500">{notifications.length} events in this session</p>
        </div>
        {notifications.length > 0 && (
          <button type="button" onClick={clearNotifications} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 shadow-sm hover:bg-zinc-50">
            Clear all
          </button>
        )}
      </div>

      {/* Emergency section at top */}
      {emergencies.length > 0 && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-rose-700">Emergency Broadcasts</p>
          <div className="space-y-2">
            {emergencies.map((note) => (
              <div key={note.id} className="rounded-xl border border-rose-200 bg-white px-3 py-2.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Emergency</span>
                  <span className="text-[11px] text-zinc-400">{relativeTime(note.timestamp)}</span>
                </div>
                <p className="text-sm font-semibold text-zinc-800">{note.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All other notifications */}
      {notifications.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-white py-16 text-center">
          <p className="text-sm font-semibold text-zinc-400">No activity yet</p>
          <p className="mt-1 text-xs text-zinc-300">Delivery events and chat alerts will appear here</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <ul>
            {rest.map((note, i) => {
              const m = meta(note.category);
              return (
                <li key={note.id} className={`flex items-start gap-3 px-4 py-3 ${i !== 0 ? "border-t border-zinc-100" : ""}`}>
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${m.dot}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${m.text}`}>{m.label}</span>
                      <span className="shrink-0 text-[11px] text-zinc-400">{relativeTime(note.timestamp)}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-zinc-800 leading-snug">{note.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
