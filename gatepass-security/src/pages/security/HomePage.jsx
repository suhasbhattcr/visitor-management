import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSecurityApp } from "../../context/SecurityAppContext";
import StatusBadge from "../../components/StatusBadge";

function relativeTime(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

function hoursInside(ts) {
  return ((Date.now() - new Date(ts).getTime()) / 3600000).toFixed(1);
}

function categoryLabel(cat) {
  const map = { DELIVERY: "Delivery", GUEST: "Guest", DAILY_HELP: "Daily Help", CAB: "Cab/Taxi", SERVICE: "Service", VENDOR: "Vendor", MEDICAL: "Medical", OTHER: "Other" };
  return map[cat] || cat || "Visitor";
}

function InitialAvatar({ name, overstay }) {
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${overstay ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { sortedDeliveries, stats, isLoading, approveDeliveryById, rejectDeliveryById, gate } = useSecurityApp();

  const pendingApprovals = useMemo(
    () => sortedDeliveries.filter((d) => d.approval_status === "PENDING"),
    [sortedDeliveries],
  );

  const currentlyInside = useMemo(
    () => sortedDeliveries.filter(
      (d) => d.approval_status === "APPROVED" && d.delivery_status !== "EXITED",
    ),
    [sortedDeliveries],
  );

  const today = new Date().toISOString().split("T")[0];
  const todayDeliveries = useMemo(
    () => sortedDeliveries.filter((d) => d.created_at?.startsWith(today)).slice(0, 5),
    [sortedDeliveries, today],
  );

  async function handleApprove(id) {
    try { await approveDeliveryById(id); } catch { alert("Failed to approve. Try again."); }
  }

  async function handleReject(id) {
    try { await rejectDeliveryById(id); } catch { alert("Failed to reject. Try again."); }
  }

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.cards.map((card) => (
          <div key={card.label} className={`rounded-2xl ${card.bg} p-4`}>
            <p className={`text-2xl font-bold ${card.tone}`}>{card.value}</p>
            <p className="mt-0.5 text-xs font-semibold text-zinc-500">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Needs attention — pending approvals */}
      {pendingApprovals.length > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white">{pendingApprovals.length}</span>
              <h2 className="font-bold text-amber-900">Awaiting Resident Approval</h2>
            </div>
            <button type="button" onClick={() => navigate("/live")} className="text-xs font-semibold text-amber-700 hover:underline">View all</button>
          </div>
          <div className="space-y-2">
            {pendingApprovals.slice(0, 4).map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm">
                <InitialAvatar name={d.delivery_person_name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900">{d.delivery_person_name}</p>
                  <p className="text-xs text-zinc-500">{d.unit} &middot; {categoryLabel(d.visitor_category)} &middot; {relativeTime(d.created_at)}</p>
                </div>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => handleApprove(d.id)} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500">Allow</button>
                  <button type="button" onClick={() => handleReject(d.id)} className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-rose-500">Deny</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Currently Inside */}
      <div className="rounded-2xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${currentlyInside.length > 0 ? "bg-emerald-500 animate-pulse" : "bg-zinc-300"}`} />
            <h2 className="font-bold text-zinc-900">Currently Inside</h2>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{currentlyInside.length}</span>
          </div>
          <button type="button" onClick={() => navigate("/live")} className="text-xs font-semibold text-zinc-500 hover:text-zinc-800">Manage</button>
        </div>
        <div className="p-3">
          {currentlyInside.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-400">No visitors currently inside</p>
          ) : (
            <div className="space-y-2">
              {currentlyInside.slice(0, 6).map((d) => {
                const hrs = parseFloat(hoursInside(d.created_at));
                const overstay = hrs >= 2;
                return (
                  <div key={d.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${overstay ? "bg-rose-50 border border-rose-200" : "bg-zinc-50"}`}>
                    <InitialAvatar name={d.delivery_person_name} overstay={overstay} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-zinc-900">{d.delivery_person_name}</p>
                        {overstay && <span className="shrink-0 rounded-full bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">Overstay</span>}
                      </div>
                      <p className="text-xs text-zinc-500">{d.unit} &middot; {categoryLabel(d.visitor_category)} &middot; {hrs}h inside</p>
                    </div>
                    {d.vehicle_number && (
                      <span className="shrink-0 rounded-lg bg-zinc-200 px-2 py-1 text-xs font-bold text-zinc-700">{d.vehicle_number}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Today activity */}
      <div className="rounded-2xl bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-4 py-3 flex items-center justify-between">
          <h2 className="font-bold text-zinc-900">Today at {gate || "Gate"}</h2>
          <button type="button" onClick={() => navigate("/live")} className="text-xs font-semibold text-zinc-500 hover:text-zinc-800">See all</button>
        </div>
        {isLoading ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-400">Loading…</p>
        ) : todayDeliveries.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-400">No entries logged today yet</p>
        ) : (
          <ul>
            {todayDeliveries.map((d, i) => (
              <li key={d.id} className={`flex items-center gap-3 px-4 py-3 ${i !== 0 ? "border-t border-zinc-100" : ""}`}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-600">
                  {(d.delivery_person_name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-800">{d.delivery_person_name} &rarr; {d.unit}</p>
                  <p className="text-xs text-zinc-400">{categoryLabel(d.visitor_category)} &middot; {relativeTime(d.created_at)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge value={d.approval_status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}