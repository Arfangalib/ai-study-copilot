import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ai-study-copilot-cyan.vercel.app"),
  title: "AI Study Copilot — Grounded answers, or none at all",
  description:
    "A study copilot that answers only from your uploaded materials, cites its sources, and refuses to hallucinate. Bug-hunt mode turns mistakes into practice.",
  openGraph: {
    title: "AI Study Copilot — Grounded answers, or none at all",
    description:
      "Answers only from your materials, cites its sources, refuses to hallucinate — with grounding quality proven by a live eval dashboard.",
    url: "/",
    siteName: "AI Study Copilot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Study Copilot — Grounded answers, or none at all",
    description:
      "Answers only from your materials, cites its sources, refuses to hallucinate — proven by a live eval dashboard.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
