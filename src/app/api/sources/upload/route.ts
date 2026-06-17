import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ingestText, extractPdfText } from "@/lib/ingest";

export const runtime = "nodejs";

const pasteSchema = z.object({
  title: z.string().min(1).max(200),
  text: z.string().min(1),
});

/**
 * Ingest study material. Two modes:
 *  - JSON  { title, text }            -> pasted/typed notes
 *  - multipart/form-data with `file`  -> PDF upload
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing `file`." }, { status: 400 });
      }
      const title = (form.get("title") as string) || file.name || "Untitled PDF";
      const text = await extractPdfText(await file.arrayBuffer());
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
    const message = err instanceof Error ? err.message : "Ingestion failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
