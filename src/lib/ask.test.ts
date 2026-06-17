import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock every infrastructure boundary so we test the real ask.ts guardrail wiring
// without a database, an API key, or any model cost. (Mocking these modules also
// means env.ts never loads, so no env is required to run this test.)
const complete = vi.fn();
const retrieve = vi.fn();
const isGrounded = vi.fn();
const strongChunks = vi.fn();
const insertValues = vi.fn();

vi.mock("@/lib/llm/provider", () => ({ complete: (...a: unknown[]) => complete(...a) }));
vi.mock("@/lib/retrieval", () => ({
  retrieve: (...a: unknown[]) => retrieve(...a),
  isGrounded: (...a: unknown[]) => isGrounded(...a),
  strongChunks: (...a: unknown[]) => strongChunks(...a),
  toCitation: (c: { chunkId: string; sourceId: string; sourceTitle: string; content: string; score: number }) => ({
    chunkId: c.chunkId,
    sourceId: c.sourceId,
    sourceTitle: c.sourceTitle,
    snippet: c.content,
    score: c.score,
  }),
}));
vi.mock("@/db", () => ({
  db: { insert: () => ({ values: (...a: unknown[]) => (insertValues(...a), Promise.resolve()) }) },
  askQueries: {},
}));

import { askGrounded } from "./ask";

const chunk = (over = {}) => ({
  chunkId: "c1",
  sourceId: "s1",
  sourceTitle: "Sliding Window Technique",
  content: "Shrink the window only after it becomes invalid.",
  topic: null,
  score: 0.6,
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("askGrounded guardrail", () => {
  it("refuses when retrieval confidence is low — and never fabricates a citation", async () => {
    retrieve.mockResolvedValue([chunk({ score: 0.1 })]);
    isGrounded.mockReturnValue(false);
    strongChunks.mockReturnValue([]);

    const r = await askGrounded("unrelated question", { persist: false });

    expect(r.groundingStatus).toBe("not_found");
    expect(r.citations).toHaveLength(0);
    expect(complete).not.toHaveBeenCalled(); // no model call wasted on a refusal
  });

  it("answers with citations when grounded", async () => {
    retrieve.mockResolvedValue([chunk()]);
    isGrounded.mockReturnValue(true);
    strongChunks.mockReturnValue([chunk()]);
    complete.mockResolvedValue("Shrink after the window becomes invalid [1].");

    const r = await askGrounded("when do I shrink the window?", { persist: false });

    expect(r.groundingStatus).toBe("grounded");
    expect(r.citations).toHaveLength(1);
    expect(r.citations[0].sourceTitle).toBe("Sliding Window Technique");
  });

  it("refuses when the model self-reports NOT_FOUND even though retrieval passed", async () => {
    retrieve.mockResolvedValue([chunk()]);
    isGrounded.mockReturnValue(true);
    strongChunks.mockReturnValue([chunk()]);
    complete.mockResolvedValue("NOT_FOUND");

    const r = await askGrounded("question", { persist: false });

    expect(r.groundingStatus).toBe("not_found");
    expect(r.citations).toHaveLength(0); // second-stage guard: no citation on refusal
  });

  it("does not write to history when persist is false", async () => {
    retrieve.mockResolvedValue([chunk()]);
    isGrounded.mockReturnValue(true);
    strongChunks.mockReturnValue([chunk()]);
    complete.mockResolvedValue("answer [1]");

    await askGrounded("question", { persist: false });

    expect(insertValues).not.toHaveBeenCalled();
  });
});
