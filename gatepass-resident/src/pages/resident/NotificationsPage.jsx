import { useResidentApp } from "../../context/ResidentAppContext";

function relativeTime(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

const CATEGORY_META = {
  DELIVERY: { emoji: "📦", color: "bg-amber-100 text-amber-700", dot: "bg-amber-400" },
  CHAT: { emoji: "💬", color: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-400" },
  SYSTEM: { emoji: "🔔", color: "bg-zinc-100 text-zinc-600", dot: "bg-zinc-400" },
};

function categoryMeta(cat) {
  return CATEGORY_META[String(cat || "").toUpperCase()] || CATEGORY_META.SYSTEM;
}

export default function NotificationsPage() {
  const {
    notifications,
    clearNotifications,
    notificationPermission,
    requestNotificationPermission,
  } = useResidentApp();

  return (
    <div className="space-y-4">
      {/* Permission + Clear row */}
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-2 w-2 rounded-full ${notificationPermission === "granted" ? "bg-emerald-500" : "bg-zinc-300"}`}
            aria-hidden="true"
          />
          <span className="text-xs font-medium text-zinc-600">
            Browser alerts: <span className="font-bold text-zinc-900">{notificationPermission}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {notificationPermission !== "granted" && notificationPermission !== "unsupported" && (
            <button
              type="button"
              className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition active:scale-95"
              onClick={() => requestNotificationPermission().catch(() => {})}
            >
              Enable
            </button>
          )}
          <button
            type="button"
            className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50"
            onClick={clearNotifications}
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Notifications timeline */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white py-14 text-center">
          <span className="text-3xl" aria-hidden="true">🔔</span>
          <p className="mt-3 text-sm font-semibold text-zinc-500">No alerts yet</p>
          <p className="mt-1 text-xs text-zinc-400">Chat and delivery alerts will appear here</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <ul>
            {notifications.map((note, index) => {
              const meta = categoryMeta(note.category);
              return (
                <li key={note.id} className={`flex items-start gap-3 px-4 py-3.5 ${index !== 0 ? "border-t border-zinc-100" : ""}`}>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base ${meta.color}`}>
                    {meta.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        {String(note.category || "Alert").toUpperCase()}
                      </span>
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
