import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AI Study Copilot — grounded answers, or none at all";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Dynamically generated social card so shared links preview professionally. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b1020",
          color: "#e2e8f0",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 26, color: "#a5b4fc", letterSpacing: 2, textTransform: "uppercase" }}>
            Grounded Study Copilot
          </div>
          <div style={{ fontSize: 68, fontWeight: 700, marginTop: 16, lineHeight: 1.1, color: "#f8fafc" }}>
            Answers from your notes —
          </div>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, color: "#818cf8" }}>
            or none at all.
          </div>
          <div style={{ fontSize: 28, marginTop: 24, color: "#94a3b8", maxWidth: 900 }}>
            Cites its sources, refuses to hallucinate, and proves grounding quality with a live eval dashboard.
          </div>
        </div>

        <div style={{ display: "flex", gap: 20 }}>
          {[
            ["100%", "citation precision"],
            ["100%", "refusal accuracy"],
            ["~92%", "answer support"],
          ].map(([v, l]) => (
            <div
              key={l}
              style={{
                display: "flex",
                flexDirection: "column",
                background: "#161c2e",
                border: "1px solid #2a3350",
                borderRadius: 16,
                padding: "20px 28px",
              }}
            >
              <div style={{ fontSize: 40, fontWeight: 700, color: "#34d399" }}>{v}</div>
              <div style={{ fontSize: 22, color: "#94a3b8" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
