import { z } from "zod";

/**
 * Centralized, validated environment access. Importing this module throws early
 * with a clear message if required vars are missing, instead of failing deep in a
 * request. Model ids are intentionally env-driven (availability/pricing shifts).
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  OPENAI_REASONING_MODEL: z.string().default("gpt-5.5"),
  OPENAI_FAST_MODEL: z.string().default("gpt-5.4-mini"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  RETRIEVAL_MIN_SCORE: z.coerce.number().min(0).max(1).default(0.25),
  RETRIEVAL_TOP_K: z.coerce.number().int().positive().default(6),
  // Spend protection for the public demo.
  RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(5),
  DAILY_REQUEST_CAP: z.coerce.number().int().positive().default(300),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;

/** Embedding dimensionality for the configured model (text-embedding-3-small = 1536). */
export const EMBEDDING_DIMS = 1536;
