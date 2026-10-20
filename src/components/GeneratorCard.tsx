import { evaluateAlerts, formatAgo } from "@/lib/generators";
import type { Generator, Thresholds } from "@/lib/schema";

interface Props {
  generator: Generator;
  thresholds: Thresholds;
  now: number;
  staleAfterMs: number;
}

const STATUS_STYLES = {
  running: "bg-emerald-500/15 text-emerald-300",
  idle: "bg-slate-500/20 text-slate-300",
  alarm: "bg-red-500/20 text-red-300",
};

function Bar({ label, value, warn }: { label: string; value: number; warn: boolean }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className={warn ? "text-red-300" : ""}>{value.toFixed(0)}%</span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} className="h-2 rounded bg-slate-800">
        <div className={`h-2 rounded ${warn ? "bg-red-400" : "bg-emerald-400"}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

export function GeneratorCard({ generator: g, thresholds, now, staleAfterMs }: Props) {
  const alerts = evaluateAlerts(g, thresholds);
  const age = now - g.updatedAt;
  const stale = age > staleAfterMs;

  return (
    <article data-testid="generator-card" data-id={g.id} data-updated-at={g.updatedAt} aria-label={g.name} className={`rounded-xl border bg-slate-900 p-4 ${alerts.length ? "border-red-500/50" : "border-slate-800"} ${stale ? "opacity-70" : ""}`}>
      <header className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="font-semibold">{g.name}</h2>
          <p className="text-xs text-slate-400">{g.id} · {g.site}</p>
        </div>
        <span className={`rounded px-2 py-0.5 text-xs font-medium uppercase ${STATUS_STYLES[g.status]}`}>{g.status}</span>
      </header>

      <p className="mb-3 text-3xl font-semibold tabular-nums">
        {g.outputKw.toFixed(0)} <span className="text-base font-normal text-slate-400">kW</span>
      </p>

      <div className="mb-3 space-y-2">
        <Bar label="Load" value={g.loadPct} warn={g.loadPct > thresholds.maxLoadPct} />
        <Bar label="Fuel" value={g.fuelPct} warn={g.fuelPct < thresholds.minFuelPct} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-slate-400">Coolant</dt>
        <dd className="text-right tabular-nums">{g.coolantTempC.toFixed(1)} °C</dd>
        <dt className="text-slate-400">Battery</dt>
        <dd className="text-right tabular-nums">{g.batteryV.toFixed(1)} V</dd>
        <dt className="text-slate-400">Frequency</dt>
        <dd className="text-right tabular-nums">{g.frequencyHz.toFixed(2)} Hz</dd>
        <dt className="text-slate-400">Runtime</dt>
        <dd className="text-right tabular-nums">{g.runtimeHrs.toFixed(1)} h</dd>
      </dl>

      {alerts.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1" aria-label="Alerts">
          {alerts.map((a) => (
            <li key={a} className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-300">{a}</li>
          ))}
        </ul>
      )}

      <p className={`mt-3 text-xs ${stale ? "text-amber-300" : "text-slate-500"}`}>
        {stale ? "Stale · " : ""}Updated {formatAgo(age)}
      </p>
    </article>
  );
}
