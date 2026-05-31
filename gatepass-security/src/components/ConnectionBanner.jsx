export default function ConnectionBanner({ connected }) {
  if (connected) {
    return null;
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      Reconnecting to realtime service. Data will refresh once the socket is back.
    </div>
  );
}
