import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";

import { renderGuide } from "@/lib/markdown";
import { GuideClient } from "./GuideClient";

export const metadata: Metadata = {
  title: "User Guide",
  description: "How to run an operation on Verity — setup, daily use and reference.",
};

/**
 * The guide has one source: `GUIDE.md` sitting next to this file.
 *
 * It is read from disk rather than imported so the Markdown stays readable in
 * the repository and on GitHub — the same file a person opens is the file the
 * app renders. Duplicating it into a TSX constant is how documentation and
 * product drift apart.
 */
export default async function GuidePage() {
  const source = await readFile(path.join(process.cwd(), "src/app/guide/GUIDE.md"), "utf8");
  const { html, headings } = renderGuide(source);

  return <GuideClient html={html} headings={headings} />;
}
