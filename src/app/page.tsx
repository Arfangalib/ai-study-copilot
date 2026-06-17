"use client";

import { useState } from "react";

type Citation = {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  snippet: string;
  score: number;
};

type AskResult = {
  question: string;
  answer: string;
  groundingStatus: "grounded" | "not_found";
  citations: Citation[];
};

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      <header className="mb-10">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-indigo-500">
          Grounded Study Copilot
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Answers from <span className="text-indigo-500">your</span> notes — or none at all.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Upload your DSA &amp; cloud notes, then ask. Every answer cites the exact source
          chunks it used. When the answer isn&apos;t in your materials, it refuses instead of
          guessing.
        </p>
        <a
          href="/eval"
          className="mt-3 inline-block text-xs font-medium text-indigo-500 hover:text-indigo-400"
        >
          See how grounding quality is measured →
        </a>
      </header>

      <UploadPanel />
      <div className="my-8 h-px bg-zinc-200 dark:bg-zinc-800" />
      <AskPanel />
    </main>
  );
}

function UploadPanel() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim() || !text.trim()) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/sources/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setStatus(`Indexed "${data.title}" into ${data.chunkCount} chunks.`);
      setText("");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        1 · Add study material
      </h2>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (e.g. Sliding Window Notes)"
        className="mb-2 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-zinc-700"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your notes here…"
        rows={5}
        className="w-full resize-y rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-zinc-700"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={busy || !title.trim() || !text.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-40"
        >
          {busy ? "Indexing…" : "Index notes"}
        </button>
        {status && <span className="text-xs text-zinc-500">{status}</span>}
      </div>
    </section>
  );
}

function AskPanel() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    if (!question.trim()) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ask failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ask failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        2 · Ask a grounded question
      </h2>
      <div className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="e.g. When do I shrink the window in a sliding-window problem?"
          className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-zinc-700"
        />
        <button
          onClick={ask}
          disabled={busy || !question.trim()}
          className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900"
        >
          {busy ? "Thinking…" : "Ask"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      {result && <Answer result={result} />}
    </section>
  );
}

function Answer({ result }: { result: AskResult }) {
  const grounded = result.groundingStatus === "grounded";
  return (
    <div className="mt-5 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
          grounded
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${grounded ? "bg-emerald-500" : "bg-amber-500"}`}
        />
        {grounded ? "Grounded in your materials" : "Not found in your materials"}
      </span>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{result.answer}</p>

      {result.citations.length > 0 && (
        <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Citations
          </p>
          <ol className="space-y-2">
            {result.citations.map((c, i) => (
              <li key={c.chunkId} className="text-xs text-zinc-500">
                <span className="mr-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
                  [{i + 1}]
                </span>
                <span className="font-medium text-zinc-600 dark:text-zinc-400">
                  {c.sourceTitle}
                </span>
                <span className="ml-1.5 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800">
                  {(c.score * 100).toFixed(0)}% match
                </span>
                <p className="mt-1 text-zinc-500">{c.snippet}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
