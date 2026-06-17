import { getLatestEvalRun, getEvalHistory } from "@/lib/dashboard";
import { MetricGauge } from "@/components/MetricGauge";

export const dynamic = "force-dynamic";

export default async function EvalPage() {
  const [run, history] = await Promise.all([getLatestEvalRun(), getEvalHistory()]);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      <header className="mb-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-indigo-500">
          Evaluation
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Does the grounding actually work? Measured, not claimed.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          A fixed set of 20 questions runs through the real ask pipeline — answerable ones from the
          notes, plus plausible out-of-corpus questions that must be refused. Three metrics score the
          result.
        </p>
      </header>

      {!run ? (
        <EmptyState />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
            <span>{run.totalCases} cases</span>
            <span>·</span>
            <span>last run {new Date(run.createdAt).toLocaleString()}</span>
            {history.length > 1 && (
              <>
                <span>·</span>
                <span>{history.length} runs recorded</span>
              </>
            )}
          </div>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricGauge
              label="Citation precision"
              value={run.citationPrecision}
              hint="cited the right source"
            />
            <MetricGauge
              label="Refusal accuracy"
              value={run.refusalAccuracy}
              hint="answer-vs-refuse decision"
            />
            <MetricGauge
              label="Answer support"
              value={run.answerSupportRate}
              hint="claims backed by sources"
            />
          </section>

          <CaseTable details={run.details} />
          <Methodology />
        </>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
      <p className="text-sm text-zinc-500">No eval runs yet.</p>
      <p className="mt-1 text-xs text-zinc-400">
        Run <code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">npm run eval</code>{" "}
        to score the pipeline and populate this dashboard.
      </p>
    </div>
  );
}

function CaseTable({ details }: { details: import("@/eval/metrics").CaseResult[] }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold">Per-case results</h2>
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2 font-medium">Case</th>
              <th className="px-3 py-2 font-medium">Expected</th>
              <th className="px-3 py-2 font-medium">Result</th>
              <th className="px-3 py-2 font-medium">Cite</th>
              <th className="px-3 py-2 font-medium">Support</th>
            </tr>
          </thead>
          <tbody>
            {details.map((r) => (
              <tr key={r.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-3 py-2 font-mono">{r.id}</td>
                <td className="px-3 py-2 text-zinc-500">
                  {r.expectAnswerable ? "answer" : "refuse"}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 ${
                      r.refusalCorrect
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                    }`}
                  >
                    {r.actualStatus === "grounded" ? "answered" : "refused"}
                    {r.refusalCorrect ? " ✓" : " ✗"}
                  </span>
                </td>
                <td className="px-3 py-2 text-zinc-500">
                  {r.citationPrecision !== null ? `${Math.round(r.citationPrecision * 100)}%` : "—"}
                </td>
                <td className="px-3 py-2 text-zinc-500">
                  {r.support ? `${r.support.supported}/${r.support.total}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Methodology() {
  return (
    <section className="mt-8 rounded-xl bg-zinc-50 p-4 text-xs leading-relaxed text-zinc-500 dark:bg-zinc-900">
      <p className="mb-2 font-semibold text-zinc-700 dark:text-zinc-300">How these are measured</p>
      <ul className="space-y-1.5">
        <li>
          <strong>Citation precision</strong> — of the sources an answer cites, the fraction that
          are the expected source for that question (scored on answerable cases).
        </li>
        <li>
          <strong>Refusal accuracy</strong> — across all 20 cases, how often the system made the
          correct answer-vs-refuse decision (answer in-corpus, refuse out-of-corpus).
        </li>
        <li>
          <strong>Answer support</strong> — an LLM judge breaks each answer into claims and counts
          how many are backed by the cited excerpts.
        </li>
      </ul>
      <p className="mt-2 text-zinc-400">
        Runs are executed from the CLI (<code>npm run eval</code>), never triggered by visitors, so
        the public demo can&apos;t be made to spend on model calls. This page is read-only.
      </p>
    </section>
  );
}
