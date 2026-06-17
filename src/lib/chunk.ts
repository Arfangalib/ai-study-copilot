export type ChunkOptions = {
  /** Target maximum characters per chunk. */
  maxChars?: number;
  /** Characters of trailing context carried into the next chunk. */
  overlap?: number;
};

const DEFAULTS: Required<ChunkOptions> = { maxChars: 1000, overlap: 150 };

/**
 * Deterministic text chunker. Packs whole paragraphs up to `maxChars`, hard-splits
 * any oversized paragraph, and carries `overlap` trailing chars into the next chunk
 * so a concept that straddles a boundary stays retrievable. Pure + side-effect free
 * so it can be unit-tested directly.
 */
export function chunkText(input: string, options: ChunkOptions = {}): string[] {
  const { maxChars, overlap } = { ...DEFAULTS, ...options };
  const text = input.replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  // Split into paragraphs, then hard-split any paragraph longer than maxChars.
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((p) => (p.length <= maxChars ? [p] : hardSplit(p, maxChars)));

  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) chunks.push(current);
    current = overlap > 0 ? `${tail(current, overlap)}${para}` : para;
    if (current.length > maxChars) {
      // Overlap + para still too big: flush hard-split pieces.
      const pieces = hardSplit(current, maxChars);
      chunks.push(...pieces.slice(0, -1));
      current = pieces[pieces.length - 1] ?? "";
    }
  }
  if (current.trim()) chunks.push(current);
  return chunks;
}

function tail(s: string, n: number): string {
  if (n <= 0 || !s) return "";
  return s.slice(Math.max(0, s.length - n));
}

function hardSplit(s: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out;
}
