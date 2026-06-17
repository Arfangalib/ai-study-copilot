import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { usageEvents } from "@/db/schema";
import { env } from "@/lib/env";

export type Guard = { ok: true } | { ok: false; status: number; message: string };

/** Hash the client IP so we never store raw addresses. */
function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * DB-backed spend guard for the public demo. Enforces both a per-IP per-minute
 * rate limit and a global daily request cap, then records the request. Works
 * across serverless instances (unlike in-memory limiters). Returns a 429 guard
 * when either limit is exceeded.
 */
export async function guardRequest(headers: Headers, route: string): Promise<Guard> {
  const ipHash = hashIp(clientIp(headers));

  const rows = await db.execute<{ per_ip_min: number; today_total: number }>(sql`
    SELECT
      count(*) FILTER (WHERE ip_hash = ${ipHash} AND created_at > now() - interval '1 minute') AS per_ip_min,
      count(*) FILTER (WHERE created_at > date_trunc('day', now())) AS today_total
    FROM ${usageEvents}
  `);
  const row = rows[0] ?? { per_ip_min: 0, today_total: 0 };

  if (Number(row.today_total) >= env.DAILY_REQUEST_CAP) {
    return {
      ok: false,
      status: 429,
      message: "This demo has hit its daily usage cap. Please try again tomorrow.",
    };
  }
  if (Number(row.per_ip_min) >= env.RATE_LIMIT_PER_MIN) {
    return {
      ok: false,
      status: 429,
      message: "You're sending requests too quickly. Please wait a minute and try again.",
    };
  }

  await db.insert(usageEvents).values({ ipHash, route });
  return { ok: true };
}
