# Case Study — AI Study Copilot

**A grounded study assistant that answers only from your materials, cites its sources, and refuses to hallucinate — with the grounding quality proven by a live evaluation harness.**

- **Live demo:** https://ai-study-copilot-cyan.vercel.app/
- **Code:** https://github.com/Arfangalib/ai-study-copilot
- **Stack:** Next.js (App Router) · TypeScript · Postgres + pgvector · Drizzle · OpenAI · Vitest · Vercel

---

## 1. The problem

Most "chat with your notes" apps will confidently make things up. For a *study* tool that's not a minor annoyance — a plausible-but-wrong explanation actively teaches the wrong thing. The hard part isn't wiring an LLM to a vector store; it's making the system **trustworthy and provably so**: it should answer only from the material it was given, show its work, and say "I don't know" instead of bluffing.

I scoped a 4-week build around that single idea, and treated grounding as a contract to be measured rather than a feature to be claimed.

## 2. What it does

1. **Upload** notes (paste or PDF) → chunk → embed → store in pgvector.
2. **Ask** a question → retrieve the most similar chunks → answer **strictly from them with citations**, or **refuse** ("not found in your materials") when retrieval confidence is too low. Every answer's grounding status is stored.
3. **Bug Hunt** → paste buggy code → get a diagnosis, retrieve the underlying concept from your notes, and generate practice questions from it.
4. **Dashboards** → a study view (coverage, weak topics) and an **evaluation view** that scores the grounding quality.

## 3. The key design decision: honest grounding

My first plan had a subtle integrity flaw: it framed *bug diagnosis* as a cited, grounded task. But diagnosing a bug is the **model's own reasoning** — there is no chunk in your notes that "proves" your sliding-window pointer is off by one. Attaching citations to it would have been dishonest, and it would have fallen apart under any technical interviewer's questioning.

So I split the two cleanly:

- **Bug diagnosis** is labeled in the UI as **"Model inference — not from your notes."** No citations.
- **Citations are reserved for retrieval.** The bug-hunt flow *infers the topic* from the diagnosis, retrieves the **concept** from your notes, and cites *that* — then generates practice questions strictly from the cited chunks.

This is the spine of the whole project: **source facts and model inference are never blurred together.**

## 4. Architecture

![Architecture](public/architecture.svg)

A request flows Browser → guarded API route → a small domain layer (`ingest`, `retrieval`, `ask`, `bug-hunt`, `quiz`, `weak-topics`) → a **swappable LLM provider** and Postgres/pgvector. Every model call goes through one boundary (`src/lib/llm/provider.ts`) with model ids read from env, so switching model or provider is a config change, not a rewrite. The **evaluation harness runs offline** (CLI), scoring the real ask pipeline and writing results that the read-only `/eval` dashboard displays.

## 5. Evaluation — the part I'm most proud of

A fixed **20-question set** runs through the *actual* ask pipeline: 15 answerable from the notes, plus 5 deliberately *plausible* out-of-corpus questions (Dijkstra's algorithm, B-tree indexes, Kubernetes pods) that **must be refused** — so refusal is tested honestly, not gamed with silly questions. Three defensible metrics (I deliberately avoided the slippery "faithfulness" label):

| Metric | What it measures |
| --- | --- |
| **Citation precision** | Of the sources an answer cites, the fraction that are the correct source |
| **Refusal accuracy** | How often the answer-vs-refuse gate makes the right call across all 20 cases |
| **Answer support** | Fraction of an answer's claims backed by its cited excerpts (LLM-as-judge) |

### The story worth telling

The **first eval run scored 28% citation precision.** Instead of hiding it, I read the per-case output and found the cause: answers were citing the top *four* retrieved chunks when only *one* was actually relevant — padding citations with marginally-related sources. I changed citation selection to keep only chunks within a small score margin of the top match, re-ran, and:

> **Citation precision: 28% → 100%.** Refusal accuracy 100%. Answer support improved to ~92%.

That loop — *measure → diagnose a real weakness → fix the root cause → re-measure* — is the difference between a demo and an engineered product. The fix also made answers read better (one clean citation instead of four noisy ones).

## 6. Engineering decisions & tradeoffs

- **Two-stage grounding guard.** The retrieval-confidence threshold is the first gate; the answer prompt is the second (the model self-refuses with `NOT_FOUND` if the context is insufficient). Defense in depth against hallucination.
- **Swappable provider.** All LLM access behind one module; model ids in env. Honest "model-agnostic" claim, and trivial to A/B a different model.
- **Cost & abuse guards on a public, paid-API demo.** Per-IP rate limiting + a DB-backed global daily cap + a max-token ceiling. Eval runs are CLI-only so visitors can't trigger spend. IPs are stored hashed.
- **Read-modify-write for weak-topic scoring** instead of clever SQL arithmetic, after a typed-parameter bug — chosen for correctness and clarity at this scale.
- **Tested where it counts.** Pure logic (chunking, EWMA scoring, eval metrics, the grounding guardrail) is unit-tested; the expensive LLM paths are validated by the eval harness rather than brittle mocks.

## 7. Why this is relevant to enterprise AI

The themes here — **retrieval grounding, refusal over hallucination, separating sourced facts from model inference, and measurable evaluation with stored, auditable runs** — are exactly the trust-and-governance concerns that enterprise AI platforms (e.g. SAP's Joule / Business Technology Platform) are built around. This project is a small, end-to-end demonstration of taking an LLM feature from "it usually works" to "here is the number, and here is how I improved it."

## 8. What I'd do next

- Persist multiple eval runs over time and chart the **trend** (regression gate in CI).
- Topic-tag chunks at ingest to power finer weak-topic coverage.
- Add auth + multi-workspace for real multi-user use.
- Hybrid retrieval (BM25 + vector) to push citation recall on larger corpora.

## 9. Run it locally

```bash
npm install
cp .env.example .env.local   # add DATABASE_URL + OPENAI_API_KEY
npm run db:migrate           # enables pgvector + creates tables
npm run db:seed              # loads the DSA/cloud corpus
npm run dev                  # http://localhost:3000
npm run eval                 # score the pipeline -> /eval
```
