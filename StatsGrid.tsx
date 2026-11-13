import type { Stats } from "@/lib/merge";

export function StatsGrid({ stats }: { stats: Stats | null }) {
  if (!stats) return null;
  const items: [string, number][] = [
    ["Accounts", stats.accounts],
    ["With meter", stats.withMeter],
    ["Missing meter", stats.missingMeter],
    ["Found in DISC", stats.foundInDisc],
  ];
  return (
    <div className="mb-3.5 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-line px-3 py-2.5">
          <b className="block text-[22px]">{value.toLocaleString()}</b>
          <span className="text-xs text-muted">{label}</span>
        </div>
      ))}
    </div>
  );
}
