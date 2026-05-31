const statusClassMap = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
  DELIVERED: "bg-blue-100 text-blue-800",
  NOT_DELIVERED: "bg-slate-200 text-slate-700",
  COLLECTED: "bg-teal-100 text-teal-800",
  EXITED: "bg-zinc-200 text-zinc-600",
};

export default function StatusBadge({ value }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-semibold tracking-wide ${
        statusClassMap[value] || "bg-zinc-200 text-zinc-700"
      }`}
    >
      {value}
    </span>
  );
}
