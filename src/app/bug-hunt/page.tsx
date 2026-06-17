"use client";

import { useState } from "react";

type Citation = {
  chunkId: string;
  sourceTitle: string;
  snippet: string;
  score: number;
};

type Question = {
  id: string;
  type: "mcq" | "short";
  prompt: string;
  options: string[];
};

type BugHuntResult = {
  bugHuntId: string;
  diagnosis: string;
  topic: string;
  groundingStatus: "grounded" | "not_found";
  conceptCitations: Citation[];
  questions: Question[];
};

const SAMPLE = `def length_of_longest_substring(s):
    seen = set()
    left = 0
    best = 0
    for right in range(len(s)):
        while s[right] in seen:
            seen.remove(s[left])
        seen.add(s[right])
        left += 1
        best = max(best, right - left + 1)
    return best`;

export default function BugHuntPage() {
  const [code, setCode] = useState(SAMPLE);
  const [language, setLanguage] = useState("python");
  const [result, setResult] = useState<BugHuntResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function hunt() {
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/bug-hunt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, language: language || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Bug hunt failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bug hunt failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      <header className="mb-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-indigo-500">
          Bug Hunt
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Paste buggy code. Learn the concept behind the mistake.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          The diagnosis is the model&apos;s reasoning. The <em>concept</em> is pulled from your
          notes with citations — then you get targeted practice on it.
        </p>
      </header>

      <div className="mb-2 flex gap-2">
        <input
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          placeholder="language (optional)"
          className="w-40 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-zinc-700"
        />
      </div>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        rows={12}
        className="w-full resize-y rounded-lg border border-zinc-300 bg-transparent px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400 dark:border-zinc-700"
      />
      <button
        onClick={hunt}
        disabled={busy || !code.trim()}
        className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-40"
      >
        {busy ? "Hunting…" : "Find the bug"}
      </button>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      {result && <Result result={result} />}
    </main>
  );
}

function Result({ result }: { result: BugHuntResult }) {
  return (
    <div className="mt-8 space-y-6">
      {/* Diagnosis — explicitly labeled as model inference, no citations. */}
      <section className="rounded-xl border border-amber-300 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            Model inference · not from your notes
          </span>
          <span className="text-xs text-zinc-500">topic: {result.topic}</span>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.diagnosis}</p>
      </section>

      {/* Concept — grounded in the user's notes. */}
      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-2 text-sm font-semibold">The concept, from your notes</h2>
        {result.groundingStatus === "grounded" ? (
          <ol className="space-y-2">
            {result.conceptCitations.map((c, i) => (
              <li key={c.chunkId} className="text-xs text-zinc-500">
                <span className="mr-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
                  [{i + 1}]
                </span>
                <span className="font-medium text-zinc-600 dark:text-zinc-400">
                  {c.sourceTitle}
                </span>
                <span className="ml-1.5 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] dark:bg-zinc-800">
                  {(c.score * 100).toFixed(0)}% match
                </span>
                <p className="mt-1">{c.snippet}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            This concept (&ldquo;{result.topic}&rdquo;) isn&apos;t in your uploaded notes yet — add
            notes on it to unlock cited review and practice questions.
          </p>
        )}
      </section>

      {/* Practice — generated strictly from the cited chunks. */}
      {result.questions.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold">Practice ({result.questions.length})</h2>
          <div className="space-y-4">
            {result.questions.map((q) => (
              <QuestionCard key={q.id} question={q} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function QuestionCard({ question }: { question: Question }) {
  const [answer, setAnswer] = useState("");
  const [graded, setGraded] = useState<{
    isCorrect: boolean;
    explanation: string;
    expectedAnswer: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!answer.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/quiz-attempts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quizQuestionId: question.id, userAnswer: answer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Grading failed");
      setGraded(data);
    } catch {
      setGraded(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="mb-3 text-sm font-medium">{question.prompt}</p>

      {question.type === "mcq" ? (
        <div className="space-y-2">
          {question.options.map((opt) => (
            <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name={question.id}
                value={opt}
                checked={answer === opt}
                onChange={() => setAnswer(opt)}
                disabled={!!graded}
              />
              {opt}
            </label>
          ))}
        </div>
      ) : (
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Your answer…"
          rows={2}
          disabled={!!graded}
          className="w-full resize-y rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-zinc-700"
        />
      )}

      {!graded ? (
        <button
          onClick={submit}
          disabled={busy || !answer.trim()}
          className="mt-3 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900"
        >
          {busy ? "Checking…" : "Check answer"}
        </button>
      ) : (
        <div
          className={`mt-3 rounded-lg px-3 py-2 text-xs ${
            graded.isCorrect
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          <p className="font-medium">{graded.isCorrect ? "Correct" : "Not quite"}</p>
          <p className="mt-1">{graded.explanation}</p>
        </div>
      )}
    </div>
  );
}
