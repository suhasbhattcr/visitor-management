import { useSecurityApp } from "../../context/SecurityAppContext";

export default function SecurityStats() {
  const { stats } = useSecurityApp();

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((card) => (
        <article key={card.label} className="rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{card.label}</p>
          <p className={`mt-2 text-2xl font-bold ${card.tone}`}>{card.value}</p>
        </article>
      ))}
    </div>
  );
}
