import { useState } from "react";
import { useSecurityApp } from "../../context/SecurityAppContext";
import { GATES } from "../../constants/mobileOptions";

export default function GateSetupScreen() {
  const { setGateIdentity } = useSecurityApp();
  const [selectedGate, setSelectedGate] = useState(GATES[0]);
  const [officer, setOfficer] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!officer.trim()) {
      alert("Please enter officer name to continue.");
      return;
    }
    setGateIdentity(selectedGate, officer.trim());
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Gate Console</h1>
          <p className="mt-1 text-sm text-slate-400">Set up your gate station to begin</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Gate / Post
            </label>
            <div className="grid grid-cols-1 gap-2">
              {GATES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSelectedGate(g)}
                  className={`rounded-xl px-4 py-3 text-left text-sm font-semibold transition-all ${
                    selectedGate === g
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="officer-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Officer Name
            </label>
            <input
              id="officer-name"
              type="text"
              value={officer}
              onChange={(e) => setOfficer(e.target.value)}
              placeholder="Your name (e.g. Ramesh Kumar)"
              maxLength={60}
              autoComplete="name"
              className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none ring-1 ring-slate-700 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            className="mt-2 w-full rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 active:scale-[0.98]"
          >
            Start Shift at {selectedGate}
          </button>
        </form>
      </div>
    </div>
  );
}