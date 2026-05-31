import { useEffect, useState } from "react";
import { DELIVERY_PROFILES, SECURITY_UNITS, VISITOR_CATEGORIES } from "../../constants/mobileOptions";
import { fetchPreregistrations, fetchInstructionsMulti, fetchRecentVisitors, checkWatchlist } from "../../services/api";
import { useSecurityApp } from "../../context/SecurityAppContext";

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const BLANK_FORM = { delivery_person_name: "", company: "", phone_number: "", vehicle_number: "", visitor_category: "DELIVERY" };

export default function CreateDeliveryPage() {
  const { submitDeliveries } = useSecurityApp();
  const [form, setForm] = useState(BLANK_FORM);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [parcelImage, setParcelImage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recentVisitors, setRecentVisitors] = useState([]);
  const [watchlistMatches, setWatchlistMatches] = useState([]);

  // Pre-registrations & instructions keyed by unit
  const [preregsByUnit, setPreregsByUnit] = useState({});
  const [instructionsByUnit, setInstructionsByUnit] = useState({});

  // Load recent visitors on mount
  useEffect(() => {
    fetchRecentVisitors().then((data) => setRecentVisitors(data.visitors || [])).catch(() => {});
  }, []);

  // Load pre-registrations + instructions whenever selectedUnits change
  useEffect(() => {
    if (selectedUnits.length === 0) {
      setPreregsByUnit({});
      setInstructionsByUnit({});
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    Promise.all([
      fetchPreregistrations({ date: today }).catch(() => ({ preregistrations: [] })),
      fetchInstructionsMulti(selectedUnits).catch(() => ({ instructions: {} })),
    ]).then(([preregData, instData]) => {
      const allPreregs = preregData.preregistrations || [];
      const map = {};
      selectedUnits.forEach((u) => {
        map[u] = allPreregs.filter((r) => r.unit === u);
      });
      setPreregsByUnit(map);
      setInstructionsByUnit(instData.instructions || {});
    });
  }, [selectedUnits.join(",")]);

  function quickFill(profile) {
    setForm({
      delivery_person_name: profile.delivery_person_name,
      company: profile.company,
      phone_number: profile.phone_number,
      vehicle_number: "",
      visitor_category: profile.visitor_category || "DELIVERY",
    });
    // Check watchlist on quick-fill
    checkWatchlist(profile.delivery_person_name, profile.phone_number)
      .then((d) => setWatchlistMatches(d.matches || []))
      .catch(() => {});
  }

  function toggleUnit(unit) {
    setSelectedUnits((prev) =>
      prev.includes(unit) ? prev.filter((u) => u !== unit) : [...prev, unit],
    );
  }

  function selectAll() { setSelectedUnits([...SECURITY_UNITS]); }
  function clearAll() { setSelectedUnits([]); }

  async function onImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Image too large. Max 2 MB.");
      event.target.value = "";
      return;
    }
    const dataUrl = await toDataUrl(file);
    setParcelImage(dataUrl);
    event.target.value = "";
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!form.delivery_person_name.trim()) { alert("Visitor/delivery person name is required."); return; }
    if (!form.company.trim()) { alert("Company / reason is required."); return; }
    if (!form.phone_number.trim()) { alert("Phone number is required."); return; }
    if (!selectedUnits.length) { alert("Select at least one flat."); return; }
    if (form.visitor_category === "DELIVERY" && !parcelImage) {
      alert("A parcel photo is required for delivery entries. Please photograph the parcel at the gate.");
      return;
    }

    setSubmitting(true);
    try {
      await submitDeliveries({
        delivery_person_name: form.delivery_person_name.trim(),
        company: form.company.trim(),
        phone_number: form.phone_number.trim(),
        units: selectedUnits,
        parcel_image: parcelImage,
        visitor_category: form.visitor_category || "DELIVERY",
        vehicle_number: form.vehicle_number.trim() || undefined,
      });
      setForm(BLANK_FORM);
      setParcelImage("");
      setSelectedUnits([]);
      setWatchlistMatches([]);
      alert("Approval request sent to selected residents.");
    } catch (error) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  const todayPreregsForSelected = selectedUnits.flatMap((u) => (preregsByUnit[u] || []).map((r) => ({ ...r, unit: u })));

  return (
    <section className="space-y-5">

      <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-5">

        {/* Watchlist warning */}
        {watchlistMatches.length > 0 && (
          <div className="rounded-2xl border border-rose-400 bg-rose-50 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0" aria-hidden="true">
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="font-bold text-rose-800">Watchlist Match — Handle with caution</p>
            </div>
            {watchlistMatches.map((m) => (
              <p key={m.id} className="text-sm text-rose-700">{m.person_name}{m.reason ? ` — ${m.reason}` : ""}</p>
            ))}
          </div>
        )}

        {/* Quick-fill: preset profiles */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-400">Quick-fill — Preset profiles</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {DELIVERY_PROFILES.map((profile) => (
              <button
                key={profile.id}
                type="button"
                className={`rounded-xl border px-3 py-2.5 text-left transition ${
                  form.delivery_person_name === profile.delivery_person_name && form.company === profile.company
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-zinc-200 bg-zinc-50 hover:border-indigo-200 hover:bg-indigo-50"
                }`}
                onClick={() => quickFill(profile)}
              >
                <p className="text-sm font-bold text-zinc-900">{profile.delivery_person_name}</p>
                <p className="text-xs text-zinc-500">{profile.company}</p>
                <p className="text-xs text-zinc-400">{profile.phone_number}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Quick-fill: recent visitors from DB */}
        {recentVisitors.length > 0 && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-400">Recent Visitors (last 30 days)</p>
            <div className="flex flex-wrap gap-2">
              {recentVisitors.map((v, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => quickFill({ delivery_person_name: v.delivery_person_name, company: v.company, phone_number: v.phone_number, visitor_category: v.visitor_category })}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-left hover:border-indigo-200 hover:bg-indigo-50 transition"
                >
                  <p className="text-sm font-semibold text-zinc-800">{v.delivery_person_name}</p>
                  <p className="text-xs text-zinc-400">{v.company}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Visitor details */}
        <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Visitor / Delivery Details</p>

          {/* Category selector */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Visitor Type</label>
            <div className="flex flex-wrap gap-2">
              {VISITOR_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, visitor_category: cat.value }))}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    form.visitor_category === cat.value
                      ? "border-indigo-500 bg-indigo-600 text-white"
                      : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-indigo-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-700" htmlFor="dpname">Name <span className="text-rose-500">*</span></label>
            <input
              id="dpname" type="text"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="Visitor or delivery person name"
              value={form.delivery_person_name}
              onChange={(e) => {
                setForm((f) => ({ ...f, delivery_person_name: e.target.value }));
                setWatchlistMatches([]);
              }}
              onBlur={() => {
                if (form.delivery_person_name.trim()) {
                  checkWatchlist(form.delivery_person_name, form.phone_number).then((d) => setWatchlistMatches(d.matches || [])).catch(() => {});
                }
              }}
              maxLength={120} required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-700" htmlFor="dpcompany">Company / Purpose <span className="text-rose-500">*</span></label>
              <input
                id="dpcompany" type="text"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="Amazon, Guest, Plumber…"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                maxLength={120} required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-700" htmlFor="dpphone">Phone Number <span className="text-rose-500">*</span></label>
              <input
                id="dpphone" type="tel"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="10-digit mobile"
                value={form.phone_number}
                onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
                onBlur={() => {
                  if (form.phone_number.trim()) {
                    checkWatchlist(form.delivery_person_name, form.phone_number).then((d) => setWatchlistMatches(d.matches || [])).catch(() => {});
                  }
                }}
                maxLength={40} required
              />
            </div>
          </div>

          {/* Vehicle number */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-700" htmlFor="vehicle">Vehicle Number <span className="text-zinc-400 font-normal">(optional)</span></label>
            <input
              id="vehicle" type="text"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 uppercase focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="e.g. KA01AB1234"
              value={form.vehicle_number}
              onChange={(e) => setForm((f) => ({ ...f, vehicle_number: e.target.value.toUpperCase() }))}
              maxLength={20}
            />
          </div>

          {/* Visitor photo */}
          <div>
            <p className="mb-1 text-xs font-semibold text-zinc-700">
              Visitor Photo
              {form.visitor_category === "DELIVERY" ? (
                <span className="ml-1 text-rose-500">* Required for deliveries</span>
              ) : (
                <span className="ml-1 text-zinc-400 font-normal">(optional — helps resident identify the visitor)</span>
              )}
            </p>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-3 hover:border-indigo-300 hover:bg-indigo-50">
              {parcelImage ? (
                <>
                  <img src={parcelImage} alt="Parcel preview" className="h-14 w-14 rounded-lg object-cover" />
                  <div>
                    <p className="text-xs font-semibold text-indigo-700">Photo attached</p>
                    <button type="button" className="mt-0.5 text-xs text-rose-500 hover:underline" onClick={(e) => { e.preventDefault(); setParcelImage(""); }}>Remove</button>
                  </div>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-zinc-400" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                  </svg>
                  <div>
                    <p className="text-xs font-semibold text-zinc-700">Attach photo</p>
                    <p className="text-[11px] text-zinc-400">Tap to choose (max 2 MB)</p>
                  </div>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={onImageChange} />
            </label>
          </div>
        </div>

        {/* Flat selection */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Target Flats ({selectedUnits.length} selected)</p>
            <div className="flex gap-2">
              <button type="button" className="text-xs font-semibold text-indigo-600 hover:underline" onClick={selectAll}>All</button>
              <span className="text-zinc-300">|</span>
              <button type="button" className="text-xs font-semibold text-zinc-500 hover:underline" onClick={clearAll}>Clear</button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-10">
            {SECURITY_UNITS.map((unit) => {
              const active = selectedUnits.includes(unit);
              const hasPreregs = (preregsByUnit[unit] || []).length > 0;
              const hasInstructions = Boolean(instructionsByUnit[unit]);
              return (
                <div key={unit} className="relative">
                  <button
                    type="button"
                    className={`w-full rounded-xl border py-2 text-xs font-bold transition ${
                      active ? "border-indigo-500 bg-indigo-600 text-white" : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-indigo-200"
                    }`}
                    onClick={() => toggleUnit(unit)}
                  >
                    {unit}
                  </button>
                  {hasPreregs && (
                    <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white" title="Pre-registered visitor today">✓</span>
                  )}
                  {!hasPreregs && hasInstructions && (
                    <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[9px] text-white" title="Has delivery instructions">!</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pre-registration matches */}
        {todayPreregsForSelected.length > 0 && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
              Pre-registered Visitors Today
            </p>
            <div className="space-y-2">
              {todayPreregsForSelected.map((r) => (
                <div key={r.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
                  <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">{r.unit}</span>
                  <span className="font-semibold text-zinc-900 text-sm">{r.visitor_name}</span>
                  {r.company && <span className="text-xs text-zinc-500">· {r.company}</span>}
                  {r.purpose && <span className="text-xs text-zinc-400">· {r.purpose}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unit instructions */}
        {selectedUnits.some((u) => instructionsByUnit[u]) && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-700">📋 Resident Instructions</p>
            <div className="space-y-1.5">
              {selectedUnits.filter((u) => instructionsByUnit[u]).map((u) => (
                <div key={u} className="flex items-start gap-2 rounded-xl bg-white px-3 py-2">
                  <span className="shrink-0 rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">{u}</span>
                  <span className="text-sm text-zinc-700">{instructionsByUnit[u]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-indigo-600 py-4 text-base font-bold text-white shadow-md shadow-indigo-200 transition active:scale-[0.97] disabled:opacity-60"
        >
          {submitting ? "Sending…" : `Send Approval Request${selectedUnits.length > 0 ? ` to ${selectedUnits.length} flat${selectedUnits.length > 1 ? "s" : ""}` : ""}`}
        </button>
      </form>
    </section>
  );
}

