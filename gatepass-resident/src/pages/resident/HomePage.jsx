import { useMemo, useState } from "react";
import { useResidentApp } from "../../context/ResidentAppContext";

const STATUS_FILTER_OPTIONS = ["PENDING", "APPROVED", "REJECTED"];

const APPROVAL_META = {
  PENDING:  { label: "Pending",  dot: "bg-amber-500",  border: "border-l-amber-400",  badge: "bg-amber-100 text-amber-800" },
  APPROVED: { label: "Approved", dot: "bg-emerald-500", border: "border-l-emerald-400", badge: "bg-emerald-100 text-emerald-800" },
  REJECTED: { label: "Rejected", dot: "bg-rose-500",   border: "border-l-rose-400",   badge: "bg-rose-100 text-rose-800" },
};

const DELIVERY_STATUS_META = {
  PENDING: { label: "Inside",         badge: "bg-emerald-100 text-emerald-700" },
  EXITED:  { label: "Visitor exited", badge: "bg-zinc-100 text-zinc-500" },
};

const INSTRUCTION_PRESETS = [
  "Leave at door",
  "Ring bell and wait",
  "Call me before entry",
  "Hand it over to security",
  "Leave with neighbor",
];

function relativeTime(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const AVATAR_COLORS = ["bg-indigo-100 text-indigo-700","bg-violet-100 text-violet-700","bg-sky-100 text-sky-700","bg-teal-100 text-teal-700","bg-orange-100 text-orange-700"];
function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = (hash + (name || "").charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

function ParcelImage({ src }) {
  const [open, setOpen] = useState(false);
  if (!src) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-2 block overflow-hidden rounded-xl border border-zinc-200">
        <img src={src} alt="Visitor photo" className="h-28 w-full object-cover" />
        <p className="bg-zinc-50 px-2 py-1 text-center text-[11px] text-zinc-500">Tap to enlarge</p>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setOpen(false)}>
          <img src={src} alt="Visitor photo" className="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl" />
        </div>
      )}
    </>
  );
}

function VisitorPhotoHero({ src }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 block w-full overflow-hidden rounded-2xl border-2 border-amber-200 shadow-sm"
      >
        <img src={src} alt="Visitor at gate" className="w-full max-h-56 object-cover" />
        <div className="flex items-center justify-center gap-1.5 bg-amber-50 px-3 py-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-amber-600" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          <p className="text-[11px] font-semibold text-amber-700">Photo taken at gate · tap to enlarge</p>
        </div>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setOpen(false)}>
          <img src={src} alt="Visitor at gate" className="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl" />
        </div>
      )}
    </>
  );
}

function InstructionsPanel() {
  const { unit, instructions, instructionsBusy, updateInstructions } = useResidentApp();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(instructions);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateInstructions(draft);
      setEditing(false);
    } catch {
      alert("Failed to save instructions.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">📋</span>
            <span className="text-sm font-bold text-zinc-800">Delivery Instructions</span>
            <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">Unit {unit}</span>
          </div>
          <button
            type="button"
            className="rounded-xl bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200"
            onClick={() => { setDraft(instructions); setEditing(true); }}
          >
            {instructions ? "Edit" : "Add"}
          </button>
        </div>
        {instructions ? (
          <p className="border-t border-zinc-100 px-4 py-3 text-sm text-zinc-700">{instructions}</p>
        ) : (
          <p className="border-t border-zinc-100 px-4 py-3 text-sm italic text-zinc-400">No instructions set — security will use default procedures</p>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <span className="text-sm font-bold text-zinc-800">Set Delivery Instructions</span>
        <button type="button" className="text-xs text-zinc-400 hover:text-zinc-700" onClick={() => setEditing(false)}>Cancel</button>
      </div>
      <div className="px-4 py-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          {INSTRUCTION_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${draft === preset ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-indigo-50"}`}
              onClick={() => setDraft(preset)}
            >
              {preset}
            </button>
          ))}
        </div>
        <textarea
          className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          rows={2}
          placeholder="Or type custom instructions…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={400}
        />
        <button
          type="button"
          disabled={saving || instructionsBusy}
          className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white transition active:scale-[0.97] disabled:opacity-60"
          onClick={save}
        >
          {saving ? "Saving…" : "Save Instructions"}
        </button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { deliveries, isLoading, loadError, setApprovalStatus, sendChat, availableResidentUnits, unit } = useResidentApp();
  const [statusFilter, setStatusFilter] = useState("PENDING");
  // "not available" panel state keyed by delivery id
  const [notAvailableOpen, setNotAvailableOpen] = useState({});
  const [neighborUnit, setNeighborUnit] = useState({});
  const [notAvailableBusy, setNotAvailableBusy] = useState({});

  async function handleNotAvailable(delivery, mode) {
    const id = delivery.id;
    setNotAvailableBusy((b) => ({ ...b, [id]: true }));
    try {
      if (mode === "door") {
        await setApprovalStatus(id, "approve");
        sendChat({ toRole: "security", toUnit: null,
          text: `\uD83D\uDEAA I am not available. Please allow ${delivery.delivery_person_name} (${delivery.company}) to leave the item at my door. \u2014 Unit ${unit}` });
      } else if (mode === "security") {
        await setApprovalStatus(id, "reject");
        sendChat({ toRole: "security", toUnit: null,
          text: `\u26a0\ufe0f I am not available to receive ${delivery.delivery_person_name} (${delivery.company}). Please turn them away or ask them to reschedule. \u2014 Unit ${unit}` });
      } else if (mode === "neighbor") {
        const nb = neighborUnit[id] || "";
        if (!nb) return;
        await setApprovalStatus(id, "approve");
        sendChat({ toRole: "security", toUnit: null,
          text: `\u{1F91D} I am not available. Please let ${delivery.delivery_person_name} (${delivery.company}) wait for my neighbor at unit ${nb}. \u2014 Unit ${unit}` });
      }
      setNotAvailableOpen((o) => ({ ...o, [id]: false }));
    } catch { /* silent */ } finally {
      setNotAvailableBusy((b) => ({ ...b, [id]: false }));
    }
  }

  const counts = useMemo(() => STATUS_FILTER_OPTIONS.reduce((acc, s) => {
    acc[s] = deliveries.filter((d) => d.approval_status === s).length;
    return acc;
  }, {}), [deliveries]);

  const filtered = useMemo(() => [...deliveries]
    .filter((d) => d.approval_status === statusFilter)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [deliveries, statusFilter]);

  return (
    <div className="space-y-3">
      <InstructionsPanel />

      {/* Status tab switcher */}
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {STATUS_FILTER_OPTIONS.map((option) => {
          const meta = APPROVAL_META[option];
          const selected = statusFilter === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setStatusFilter(option)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                selected ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden="true" />
              {meta.label}
              {counts[option] > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${selected ? meta.badge : "bg-zinc-100 text-zinc-600"}`}>
                  {counts[option]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading && <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />)}</div>}
      {loadError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</div>}

      {!isLoading && (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white py-12 text-center">
              <span className="text-3xl" aria-hidden="true">📦</span>
              <p className="mt-3 text-sm font-semibold text-zinc-500">No {APPROVAL_META[statusFilter].label.toLowerCase()} deliveries</p>
            </div>
          ) : (
            filtered.map((delivery) => {
              const meta = APPROVAL_META[delivery.approval_status] || APPROVAL_META.PENDING;
              const dsMeta = DELIVERY_STATUS_META[delivery.delivery_status] || DELIVERY_STATUS_META.PENDING;
              const initials = getInitials(delivery.delivery_person_name);
              const colorClass = avatarColor(delivery.delivery_person_name);

              return (
                <article key={delivery.id} className={`overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm border-l-4 ${meta.border}`}>
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${colorClass}`}>
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-zinc-900 leading-tight">{delivery.delivery_person_name || "Unknown"}</p>
                          <span className="shrink-0 text-xs text-zinc-400">{relativeTime(delivery.created_at)}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-zinc-500">{delivery.company || "—"}</p>

                        {/* Phone number */}
                        {delivery.phone_number && (
                          <a
                            href={`tel:${delivery.phone_number}`}
                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-600"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.57 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.74a16 16 0 0 0 6 6l.9-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                            {delivery.phone_number}
                          </a>
                        )}

                        {/* Status badges row */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
                            {meta.label}
                          </span>
                          {delivery.approval_status === "APPROVED" && (
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${dsMeta.badge}`}>
                              {dsMeta.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Visitor photo — large hero for pending so resident can identify who is at the gate */}
                    {delivery.parcel_image && delivery.approval_status === "PENDING" && (
                      <VisitorPhotoHero src={delivery.parcel_image} />
                    )}
                    {delivery.parcel_image && delivery.approval_status !== "PENDING" && (
                      <ParcelImage src={delivery.parcel_image} />
                    )}

                    {/* Action buttons */}
                    {delivery.approval_status === "PENDING" && (
                      <div className="mt-4 space-y-2">
                        {/* Primary approve / reject */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition active:scale-[0.97]"
                            onClick={() => setApprovalStatus(delivery.id, "approve")}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                            Approve
                          </button>
                          <button
                            type="button"
                            className="flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-3 text-sm font-bold text-rose-700 transition active:scale-[0.97]"
                            onClick={() => setApprovalStatus(delivery.id, "reject")}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            Reject
                          </button>
                        </div>

                        {/* Not available toggle */}
                        <button
                          type="button"
                          onClick={() => setNotAvailableOpen((o) => ({ ...o, [delivery.id]: !o[delivery.id] }))}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          I&rsquo;m not available
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`h-3 w-3 transition-transform ${notAvailableOpen[delivery.id] ? "rotate-180" : ""}`} aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>

                        {/* Not available panel */}
                        {notAvailableOpen[delivery.id] && (
                          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 space-y-2">
                            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">How should security handle this?</p>

                            {/* Option 1 — leave at door */}
                            <button
                              type="button"
                              disabled={notAvailableBusy[delivery.id]}
                              onClick={() => handleNotAvailable(delivery, "door")}
                              className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left transition hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-base">🚪</span>
                              <div>
                                <p className="text-sm font-semibold text-zinc-900">Leave at my door</p>
                                <p className="text-[11px] text-zinc-500">Allow entry, visitor leaves item outside my flat</p>
                              </div>
                            </button>

                            {/* Option 2 — redirect to neighbor */}
                            <div className="rounded-xl border border-zinc-200 bg-white p-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-base">🤝</span>
                                <p className="text-sm font-semibold text-zinc-900">Let my neighbor receive</p>
                              </div>
                              <div className="flex gap-2">
                                <select
                                  value={neighborUnit[delivery.id] || ""}
                                  onChange={(e) => setNeighborUnit((n) => ({ ...n, [delivery.id]: e.target.value }))}
                                  className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-sm text-zinc-800 focus:border-indigo-400 focus:outline-none"
                                >
                                  <option value="">Select unit…</option>
                                  {availableResidentUnits.map((u) => (
                                    <option key={u} value={u}>{u}</option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  disabled={!neighborUnit[delivery.id] || notAvailableBusy[delivery.id]}
                                  onClick={() => handleNotAvailable(delivery, "neighbor")}
                                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition disabled:opacity-40"
                                >
                                  {notAvailableBusy[delivery.id] ? "…" : "Send"}
                                </button>
                              </div>
                              <p className="text-[11px] text-zinc-400">Security will direct visitor to the selected flat</p>
                            </div>

                            {/* Option 4 — turn away */}
                            <button
                              type="button"
                              disabled={notAvailableBusy[delivery.id]}
                              onClick={() => handleNotAvailable(delivery, "security")}
                              className="flex w-full items-center gap-3 rounded-xl border border-rose-100 bg-white px-3 py-2.5 text-left transition hover:border-rose-200 hover:bg-rose-50 disabled:opacity-50"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-base">🔄</span>
                              <div>
                                <p className="text-sm font-semibold text-zinc-900">Ask to reschedule</p>
                                <p className="text-[11px] text-zinc-500">Turn visitor away, entry denied</p>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* OTP entry — REMOVED */}
                    {/* Claim PIN — REMOVED */}
                    {/* Ask security to hold — REMOVED */}
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
