export default function ConnectionBanner({ connected }) {
  if (connected) {
    return null;
  }

  return (
    <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
      <span className="flex h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
      <p className="text-xs font-medium text-amber-800">Reconnecting to live service — data may be stale</p>
    </div>
  );
}
