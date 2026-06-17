import { db } from "@/db";
import { sources, chunks } from "@/db/schema";
import { chunkText } from "@/lib/chunk";
import { embed } from "@/lib/llm/provider";

export type IngestInput = {
  title: string;
  kind: "paste" | "text" | "pdf";
  text: string;
};

export type IngestResult = {
  sourceId: string;
  title: string;
  chunkCount: number;
};

/** Chunk -> embed -> persist a source and its chunks. The single ingestion path. */
export async function ingestText({ title, kind, text }: IngestInput): Promise<IngestResult> {
  const pieces = chunkText(text);
  if (pieces.length === 0) {
    throw new Error("No extractable text found in the provided material.");
  }

  const embeddings = await embed(pieces);
  if (embeddings.length !== pieces.length) {
    throw new Error("Embedding count did not match chunk count.");
  }

  const [source] = await db.insert(sources).values({ title, kind }).returning();
  await db.insert(chunks).values(
    pieces.map((content, idx) => ({
      sourceId: source.id,
      idx,
      content,
      embedding: embeddings[idx],
    })),
  );

  return { sourceId: source.id, title: source.title, chunkCount: pieces.length };
}

/** Extract text from a PDF buffer using unpdf (serverless-friendly, no native deps). */
export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n\n") : text;
}
