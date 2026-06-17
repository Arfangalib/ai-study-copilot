import Link from "next/link";

const REPO = "https://github.com/Arfangalib/ai-study-copilot";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-5 py-6 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          AI Study Copilot — grounded answers, or none at all.
        </span>
        <nav className="flex items-center gap-4">
          <Link href="/eval" className="hover:text-zinc-900 dark:hover:text-zinc-200">
            Eval results
          </Link>
          <a
            href={`${REPO}/blob/master/CASE_STUDY.md`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            Case study
          </a>
          <a
            href={REPO}
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
