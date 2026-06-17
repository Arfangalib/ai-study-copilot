/** Dependency-free SVG ring gauge for a 0..1 metric. Server-renderable. */
export function MetricGauge({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  const pct = Math.round(value * 100);
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value);
  const color = value >= 0.85 ? "#10b981" : value >= 0.6 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <svg width="132" height="132" viewBox="0 0 132 132" className="-rotate-90">
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          strokeWidth="12"
          className="stroke-zinc-200 dark:stroke-zinc-800"
        />
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          strokeWidth="12"
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
        <text
          x="66"
          y="66"
          textAnchor="middle"
          dominantBaseline="central"
          className="rotate-90 fill-zinc-900 text-2xl font-semibold dark:fill-zinc-100"
          style={{ transformOrigin: "center" }}
        >
          {pct}%
        </text>
      </svg>
      <p className="mt-3 text-center text-sm font-medium">{label}</p>
      {hint && <p className="mt-1 text-center text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
