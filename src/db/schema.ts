import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  real,
  boolean,
  jsonb,
  timestamp,
  vector,
  index,
} from "drizzle-orm/pg-core";

/** A single cited chunk attached to an answer or bug-hunt concept. */
export type Citation = {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  snippet: string;
  score: number;
};

export const sourceKind = pgEnum("source_kind", ["paste", "text", "pdf"]);
export const groundingStatus = pgEnum("grounding_status", [
  "grounded",
  "not_found",
]);
export const quizType = pgEnum("quiz_type", ["mcq", "short"]);
export const evalKind = pgEnum("eval_kind", ["in_corpus", "out_of_corpus"]);

/** Uploaded/pasted study material. */
export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  kind: sourceKind("kind").notNull().default("paste"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Chunked + embedded slices of a source. The retrieval unit. */
export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    idx: integer("idx").notNull(),
    content: text("content").notNull(),
    topic: text("topic"),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("chunks_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
    index("chunks_source_idx").on(t.sourceId),
  ],
);

/** Grounded Q&A history: answer + citations + whether it was grounded or refused. */
export const askQueries = pgTable("ask_queries", {
  id: uuid("id").primaryKey().defaultRandom(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  groundingStatus: groundingStatus("grounding_status").notNull(),
  citations: jsonb("citations").$type<Citation[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Bug-hunt runs. `diagnosis` is MODEL INFERENCE (not grounded). The cited
 * concept lives in `conceptCitations`, retrieved by inferred topic.
 */
export const bugHunts = pgTable("bug_hunts", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull(),
  language: text("language"),
  topic: text("topic"),
  diagnosis: text("diagnosis").notNull(),
  conceptCitations: jsonb("concept_citations").$type<Citation[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Practice questions generated from cited chunks. MCQ or short-answer + rubric. */
export const quizQuestions = pgTable("quiz_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  bugHuntId: uuid("bug_hunt_id").references(() => bugHunts.id, {
    onDelete: "set null",
  }),
  topic: text("topic"),
  type: quizType("type").notNull().default("mcq"),
  prompt: text("prompt").notNull(),
  options: jsonb("options").$type<string[]>().notNull().default([]),
  expectedAnswer: text("expected_answer").notNull(),
  rubric: text("rubric"),
  sourceChunkIds: jsonb("source_chunk_ids").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A learner's attempt at a quiz question. Feeds weak-topic scoring. */
export const quizAttempts = pgTable("quiz_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  quizQuestionId: uuid("quiz_question_id")
    .notNull()
    .references(() => quizQuestions.id, { onDelete: "cascade" }),
  userAnswer: text("user_answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  score: real("score").notNull().default(0),
  explanation: text("explanation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** EWMA mastery score per topic (lower = weaker). One row per topic. */
export const weakTopics = pgTable("weak_topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  topic: text("topic").notNull().unique(),
  score: real("score").notNull().default(0.5),
  attempts: integer("attempts").notNull().default(0),
  lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Seeded evaluation cases (in-corpus answerable + out-of-corpus negatives). */
export const evalCases = pgTable("eval_cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  question: text("question").notNull(),
  kind: evalKind("kind").notNull(),
  expectAnswerable: boolean("expect_answerable").notNull(),
  expectedChunkSnippets: jsonb("expected_chunk_snippets").$type<string[]>().notNull().default([]),
  notes: text("notes"),
});

/** One eval run's aggregate metrics + per-case detail. */
export const evalRuns = pgTable("eval_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  citationPrecision: real("citation_precision").notNull(),
  refusalAccuracy: real("refusal_accuracy").notNull(),
  answerSupportRate: real("answer_support_rate").notNull(),
  totalCases: integer("total_cases").notNull(),
  details: jsonb("details").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
