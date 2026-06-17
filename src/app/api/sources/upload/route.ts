import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ingestText, extractPdfText } from "@/lib/ingest";
import { guardRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60; // PDF extraction + embedding can take >10s

/** Upload limits — ingestion embeds the text, so cap it to bound cost. */
const MAX_TEXT_CHARS = 100_000; // ~25k tokens
const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB

const pasteSchema = z.object({
  title: z.string().min(1).max(200),
  text: z.string().min(1).max(MAX_TEXT_CHARS),
});

/**
 * Ingest study material. Two modes:
 *  - JSON  { title, text }            -> pasted/typed notes
 *  - multipart/form-data with `file`  -> PDF upload
 * Rate-limited and size-capped: ingestion embeds the content, which spends.
 */
export async function POST(req: NextRequest) {
  try {
    const guard = await guardRequest(req.headers, "sources/upload");
    if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing `file`." }, { status: 400 });
      }
      if (file.size > MAX_PDF_BYTES) {
        return NextResponse.json(
          { error: "PDF is too large (max 10 MB)." },
          { status: 413 },
        );
      }
      const title = (form.get("title") as string) || file.name || "Untitled PDF";
      const text = (await extractPdfText(await file.arrayBuffer())).slice(0, MAX_TEXT_CHARS);
      const result = await ingestText({ title, kind: "pdf", text });
      return NextResponse.json(result, { status: 201 });
    }

    const body = await req.json();
    const parsed = pasteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const result = await ingestText({ ...parsed.data, kind: "paste" });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[sources/upload]", err);
    return NextResponse.json({ error: "Ingestion failed." }, { status: 500 });
  }
}
