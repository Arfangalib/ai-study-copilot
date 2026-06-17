import {
  getCoverage,
  getWeakTopics,
  getRecentAsks,
  getRecentBugHunts,
} from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [coverage, weakTopics, recentAsks, recentBugHunts] = await Promise.all([
    getCoverage(),
    getWeakTopics(),
    getRecentAsks(),
    getRecentBugHunts(),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      <header className="mb-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-indigo-500">
          Study Dashboard
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Your coverage and weak topics.
        </h1>
      </header>

      <section className="mb-8 grid grid-cols-3 gap-4">
        <Stat label="Sources" value={coverage.sources} />
        <Stat label="Indexed chunks" value={coverage.chunks} />
        <Stat label="Tracked topics" value={coverage.trackedTopics} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold">Weak topics (lowest mastery first)</h2>
        {weakTopics.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No practice yet — run a Bug Hunt or answer some questions to build your mastery map.
          </p>
        ) : (
          <div className="space-y-2.5">
            {weakTopics.map((t) => (
              <TopicBar key={t.topic} topic={t.topic} score={t.score} attempts={t.attempts} />
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold">Recent questions</h2>
          {recentAsks.length === 0 ? (
            <p className="text-sm text-zinc-500">Nothing yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentAsks.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 ${
                      a.groundingStatus === "grounded"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {a.groundingStatus === "grounded" ? "cited" : "refused"}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">{a.question}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold">Recent bug hunts</h2>
          {recentBugHunts.length === 0 ? (
            <p className="text-sm text-zinc-500">Nothing yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentBugHunts.map((b, i) => (
                <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400">
                  <span className="font-medium">{b.topic ?? "unknown topic"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4 text-center dark:border-zinc-800">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function TopicBar({
  topic,
  score,
  attempts,
}: {
  topic: string;
  score: number;
  attempts: number;
}) {
  const pct = Math.round(score * 100);
  const color = score >= 0.7 ? "bg-emerald-500" : score >= 0.45 ? "bg-amber-500" : "bg-red-500";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium capitalize">{topic}</span>
        <span className="text-zinc-400">
          {pct}% · {attempts} {attempts === 1 ? "attempt" : "attempts"}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
