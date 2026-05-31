import { useState } from "react";
import { useResidentApp } from "../../context/ResidentAppContext";

const PURPOSE_PRESETS = [
  "Guest visit",
  "Service / Repair",
  "Delivery",
  "Domestic help",
  "Food delivery",
  "Cab / Taxi",
  "Medical visit",
  "Other",
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(str) {
  if (!str) return "";
  return new Date(str).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function isExpired(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

export default function VisitorsPage() {
  const { unit, preregistrations, addVisitorPreregistration, removePreregistration } = useResidentApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ visitor_name: "", company: "", purpose: "Guest visit", expected_date: todayStr() });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const upcoming = preregistrations.filter((r) => !isExpired(r.expected_date));
  const past = preregistrations.filter((r) => isExpired(r.expected_date));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.visitor_name.trim()) {
      alert("Visitor name is required.");
      return;
    }

    setSubmitting(true);
    try {
      await addVisitorPreregistration({
        unit,
        visitor_name: form.visitor_name.trim(),
        company: form.company.trim() || null,
        purpose: form.purpose || null,
        expected_date: form.expected_date,
      });
      setShowForm(false);
      setForm({ visitor_name: "", company: "", purpose: "Guest visit", expected_date: todayStr() });
    } catch (err) {
      alert(err.message || "Failed to save. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await removePreregistration(id);
    } catch {
      alert("Failed to remove. Try again.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header + Add button */}
      <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-sm font-bold text-zinc-900">Expected Visitors</p>
          <p className="text-xs text-zinc-500">Security will see these before asking for approval</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition active:scale-95"
          onClick={() => setShowForm(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Visitor
        </button>
      </div>

      {/* Upcoming */}
      <div>
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white py-12 text-center">
            <span className="text-3xl" aria-hidden="true">👤</span>
            <p className="mt-3 text-sm font-semibold text-zinc-500">No expected visitors</p>
            <p className="mt-1 text-xs text-zinc-400">Pre-register guests so security can identify them quickly</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="px-1 text-[11px] font-bold uppercase tracking-widest text-zinc-400">Upcoming</p>
            {upcoming.map((reg) => (
              <article key={reg.id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-100">
                  <span className="text-[10px] font-bold uppercase text-indigo-500">{new Date(reg.expected_date).toLocaleDateString([], { month: "short" })}</span>
                  <span className="text-lg font-black leading-none text-indigo-700">{new Date(reg.expected_date).getDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-zinc-900 truncate">{reg.visitor_name}</p>
                  <p className="text-xs text-zinc-500">
                    {[reg.company, reg.purpose].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-indigo-600">{formatDate(reg.expected_date)}</p>
                </div>
                <button
                  type="button"
                  disabled={deleting === reg.id}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                  onClick={() => handleDelete(reg.id)}
                  aria-label="Remove visitor"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                  </svg>
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Past (collapsed) */}
      {past.length > 0 && (
        <div className="space-y-2">
          <p className="px-1 text-[11px] font-bold uppercase tracking-widest text-zinc-400">Past ({past.length})</p>
          {past.slice(0, 5).map((reg) => (
            <article key={reg.id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 opacity-50 shadow-sm">
              <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-zinc-100">
                <span className="text-[10px] font-bold uppercase text-zinc-400">{new Date(reg.expected_date).toLocaleDateString([], { month: "short" })}</span>
                <span className="text-lg font-black leading-none text-zinc-500">{new Date(reg.expected_date).getDate()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-zinc-700 truncate">{reg.visitor_name}</p>
                <p className="text-xs text-zinc-400">{[reg.company, reg.purpose].filter(Boolean).join(" · ")}</p>
                <p className="mt-0.5 text-[11px] text-zinc-400">{formatDate(reg.expected_date)}</p>
              </div>
              <button
                type="button"
                disabled={deleting === reg.id}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-300 hover:bg-rose-50 hover:text-rose-400 disabled:opacity-40"
                onClick={() => handleDelete(reg.id)}
                aria-label="Remove"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                </svg>
              </button>
            </article>
          ))}
        </div>
      )}

      {/* Add Visitor Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 backdrop-blur-sm md:items-center md:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white md:rounded-3xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <h3 className="font-bold text-zinc-900">Pre-register Visitor</h3>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
                onClick={() => setShowForm(false)}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
              {/* Visitor name */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700" htmlFor="vname">Visitor Name <span className="text-rose-500">*</span></label>
                <input
                  id="vname"
                  type="text"
                  autoFocus
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  placeholder="e.g. John Doe"
                  value={form.visitor_name}
                  onChange={(e) => setForm((f) => ({ ...f, visitor_name: e.target.value }))}
                  maxLength={120}
                  required
                />
              </div>

              {/* Company */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700" htmlFor="vcompany">Company / Organization</label>
                <input
                  id="vcompany"
                  type="text"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  placeholder="Optional (Amazon, Swiggy…)"
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  maxLength={120}
                />
              </div>

              {/* Purpose — quick tiles */}
              <div>
                <p className="mb-1.5 text-xs font-bold text-zinc-700">Purpose</p>
                <div className="flex flex-wrap gap-2">
                  {PURPOSE_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${form.purpose === p ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-indigo-50"}`}
                      onClick={() => setForm((f) => ({ ...f, purpose: p }))}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700" htmlFor="vdate">Expected Date <span className="text-rose-500">*</span></label>
                <input
                  id="vdate"
                  type="date"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  value={form.expected_date}
                  min={todayStr()}
                  onChange={(e) => setForm((f) => ({ ...f, expected_date: e.target.value }))}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-200 transition active:scale-[0.97] disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Add to Expected Visitors"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
