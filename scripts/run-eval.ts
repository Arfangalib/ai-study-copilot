/**
 * Run the evaluation set and store a run. CLI-only (developer-triggered) so the
 * public demo can't be made to spend on ~40 model calls per run.
 * Usage: npm run eval   (requires DATABASE_URL + OPENAI_API_KEY in .env.local)
 */
import { config } from "dotenv";
config({ path: ".env.local" });

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

async function main() {
  const { runEval } = await import("../src/eval/runner");
  console.log("Running eval set through the grounded-ask pipeline…\n");

  const { runId, summary, results } = await runEval();

  for (const r of results) {
    const mark = r.refusalCorrect ? "PASS" : "FAIL";
    const detail =
      r.citationPrecision !== null
        ? `cite=${pct(r.citationPrecision)}${
            r.support ? ` support=${r.support.supported}/${r.support.total}` : ""
          }`
        : r.actualStatus;
    console.log(`  [${mark}] ${r.id.padEnd(18)} ${r.actualStatus.padEnd(10)} ${detail}`);
  }

  console.log("\n──────── Summary ────────");
  console.log(`  Cases             : ${summary.totalCases}`);
  console.log(`  Citation precision : ${pct(summary.citationPrecision)}`);
  console.log(`  Refusal accuracy   : ${pct(summary.refusalAccuracy)}`);
  console.log(`  Answer support     : ${pct(summary.answerSupportRate)}`);
  console.log(`  Stored run         : ${runId}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Eval failed:", err);
  process.exit(1);
});
