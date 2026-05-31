import { useMemo, useState, useEffect } from "react";
import { SECURITY_UNITS, VISITOR_CATEGORIES } from "../../constants/mobileOptions";
import StatusBadge from "../../components/StatusBadge";
import { useSecurityApp } from "../../context/SecurityAppContext";

function todayStr() { return new Date().toISOString().split("T")[0]; }

function relativeTime(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

function hoursAgo(ts) {
  return (Date.now() - new Date(ts).getTime()) / 3600000;
}

function categoryLabel(cat) {
  const found = VISITOR_CATEGORIES.find((c) => c.value === cat);
  return found ? found.label : (cat || "Visitor");
}

function ImageThumb({ src }) {
  const [open, setOpen] = useState(false);
  if (!src) return <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-300"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="overflow-hidden rounded-xl border border-zinc-200">
        <img src={src} alt="Parcel" className="h-12 w-12 object-cover" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setOpen(false)}>
          <img src={src} alt="Parcel full" className="max-h-[90vh] max-w-full rounded-2xl object-contain" />
        </div>
      )}
    </>
  );
}

const TABS = ["All", "Inside", "Pending"];

export default function LiveStatusPage() {
  const { sortedDeliveries, isLoading, loadError, loadDeliveries, approveDeliveryById, rejectDeliveryById, exitVisitorById, watchlist } = useSecurityApp();

  const [tab, setTab] = useState("All");
  const [dateFilter, setDateFilter] = useState(todayStr());
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [busy, setBusy] = useState({});

  // Check if a delivery person is on watchlist
  const watchlistNames = useMemo(() => new Set((watchlist || []).map((e) => e.person_name?.toLowerCase().trim())), [watchlist]);
  const watchlistPhones = useMemo(() => new Set((watchlist || []).map((e) => e.phone_number?.trim()).filter(Boolean)), [watchlist]);

  function isWatchlisted(d) {
    return watchlistNames.has(d.delivery_person_name?.toLowerCase().trim()) || watchlistPhones.has(d.phone_number?.trim());
  }

  const filteredDeliveries = useMemo(() => {
    let list = sortedDeliveries;

    // Tab filter
    if (tab === "Inside") {
      list = list.filter((d) => d.approval_status === "APPROVED" && d.delivery_status !== "EXITED");
    } else if (tab === "Pending") {
      list = list.filter((d) => d.approval_status === "PENDING");
    }

    // Date filter
    if (dateFilter) {
      list = list.filter((d) => d.created_at?.startsWith(dateFilter));
    }

    // Unit filter
    if (unitFilter) {
      list = list.filter((d) => d.unit === unitFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((d) =>
        d.delivery_person_name?.toLowerCase().includes(q) ||
        d.phone_number?.includes(q) ||
        d.company?.toLowerCase().includes(q) ||
        d.unit?.toLowerCase().includes(q),
      );
    }

    return list;
  }, [sortedDeliveries, tab, dateFilter, unitFilter, search]);

  const counts = useMemo(() => ({
    inside: sortedDeliveries.filter((d) => d.approval_status === "APPROVED" && d.delivery_status !== "EXITED").length,
    pending: sortedDeliveries.filter((d) => d.approval_status === "PENDING").length,
  }), [sortedDeliveries]);

  async function doAction(action, id) {
    if (busy[id]) return;
    setBusy((p) => ({ ...p, [id]: true }));
    try {
      if (action === "approve") await approveDeliveryById(id);
      else if (action === "reject") await rejectDeliveryById(id);
      else if (action === "exit-visitor") await exitVisitorById(id);
    } catch (e) {
      alert(e?.message || "Action failed. Try again.");
    } finally {
      setBusy((p) => ({ ...p, [id]: false }));
    }
  }

  return (
    <section className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === t ? "bg-slate-900 text-white" : "bg-white text-zinc-600 shadow-sm hover:bg-zinc-50"}`}
          >
            {t}
            {t === "Inside" && counts.inside > 0 && <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">{counts.inside}</span>}
            {t === "Pending" && counts.pending > 0 && <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">{counts.pending}</span>}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => loadDeliveries()} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 shadow-sm hover:bg-zinc-50">Refresh</button>
        </div>
      </div>

      {/* Filters row */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          placeholder="Search name, phone, unit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 lg:col-span-2"
        />
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm outline-none focus:border-indigo-400"
        />
        <div className="flex gap-2">
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm"
          >
            <option value="">All Units</option>
            {SECURITY_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <button type="button" onClick={() => { setSearch(""); setUnitFilter(""); setDateFilter(todayStr()); setTab("All"); }} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-500 shadow-sm hover:bg-zinc-50">Reset</button>
        </div>
      </div>

      {/* Status */}
      {isLoading && <p className="rounded-xl bg-zinc-50 py-4 text-center text-sm text-zinc-400">Loading…</p>}
      {loadError && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{loadError}</p>}

      {/* Card list */}
      <div className="space-y-2">
        {filteredDeliveries.length === 0 && !isLoading && (
          <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-white py-12 text-center">
            <p className="text-sm font-semibold text-zinc-400">No records match the selected filters</p>
            <button type="button" onClick={() => { setSearch(""); setUnitFilter(""); setDateFilter(""); setTab("All"); }} className="mt-2 text-xs text-indigo-600 hover:underline">Clear all filters</button>
          </div>
        )}

        {filteredDeliveries.map((d) => {
          const expanded = expandedId === d.id;
          const overstay = d.approval_status === "APPROVED" && d.delivery_status !== "EXITED" && hoursAgo(d.created_at) >= 2;
          const watchlisted = isWatchlisted(d);
          const isBusy = busy[d.id];

          return (
            <article key={d.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${watchlisted ? "border-rose-400" : overstay ? "border-amber-300" : "border-zinc-100"}`}>
              {/* Watchlist warning */}
              {watchlisted && (
                <div className="flex items-center gap-2 bg-rose-600 px-4 py-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Watchlist Match — Handle with caution</span>
                </div>
              )}

              {/* Summary row */}
              <div role="button" tabIndex={0} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 cursor-pointer" onClick={() => setExpandedId(expanded ? null : d.id)} onKeyDown={(e) => e.key === "Enter" && setExpandedId(expanded ? null : d.id)}>
                <ImageThumb src={d.parcel_image} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-2">
                      <p className="font-bold text-zinc-900 truncate">{d.delivery_person_name}</p>
                      {overstay && <span className="shrink-0 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Overstay</span>}
                    </div>
                    <span className="shrink-0 text-[11px] text-zinc-400">{relativeTime(d.created_at)}</span>
                  </div>
                  <p className="text-xs text-zinc-500">{d.company} &middot; {categoryLabel(d.visitor_category)}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-lg bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">{d.unit}</span>
                    {d.gate && <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">{d.gate}</span>}
                    <StatusBadge value={d.approval_status} />
                    {d.approval_status === "APPROVED" && d.delivery_status === "EXITED" && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">Exited</span>
                    )}
                  </div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {/* Expanded */}
              {expanded && (
                <div className="border-t border-zinc-100 bg-zinc-50 px-4 pb-4 pt-3">
                  <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Phone</p>
                      <a href={`tel:${d.phone_number}`} className="font-semibold text-indigo-600">{d.phone_number}</a>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Category</p>
                      <p className="font-semibold text-zinc-800">{categoryLabel(d.visitor_category)}</p>
                    </div>
                    {d.vehicle_number && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Vehicle</p>
                        <p className="font-semibold text-zinc-800">{d.vehicle_number}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Entry Time</p>
                      <p className="text-zinc-700">{new Date(d.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    {d.exited_at && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Exit Time</p>
                        <p className="text-zinc-700">{new Date(d.exited_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    )}
                  </div>

                  {d.parcel_image && (
                    <div className="mt-3">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Visitor Photo</p>
                      <img src={d.parcel_image} alt="Visitor" className="max-h-40 rounded-xl border border-zinc-200 object-cover" />
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {d.approval_status === "PENDING" && (
                      <>
                        <button type="button" disabled={isBusy} onClick={() => doAction("approve", d.id)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50">
                          Allow Entry
                        </button>
                        <button type="button" disabled={isBusy} onClick={() => doAction("reject", d.id)} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50">
                          Deny Entry
                        </button>
                      </>
                    )}
                    {d.approval_status === "APPROVED" && d.delivery_status !== "EXITED" && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          if (confirm(`Mark ${d.delivery_person_name} as exited? This will notify all residents who approved this visitor.`)) {
                            doAction("exit-visitor", d.id);
                          }
                        }}
                        className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-600 disabled:opacity-50"
                      >
                        Visitor Exited
                      </button>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}