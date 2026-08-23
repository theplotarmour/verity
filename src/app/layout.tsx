import type { ReactNode } from "react";

export const metadata = {
  title: "Verity",
  description: "Module-driven business operating platform",
};

/**
 * Root shell.
 *
 * Bible V4 defines four role-centric experiences, and
 * implementation/01-repository/repository-structure.md places them in the route
 * groups (hq), (owner), (worker) and (portal). Route groups are parenthesised
 * and never appear in a URL, which is what keeps them distinct from the legacy
 * VEDA routes /owner and /worker that forbidden pattern #9 bans.
 *
 * No shell is built here yet: the objective is the platform substrate, and a
 * role-centric experience is only meaningful once capabilities exist to expose.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
