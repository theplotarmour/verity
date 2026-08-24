import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/**
 * Inter and IBM Plex Mono, as specified on the identity board.
 *
 * Loaded through `next/font`, which self-hosts them at build time. The design
 * source links Google Fonts directly; doing that here would put a render-
 * blocking third-party request in front of an authenticated operational tool
 * and leak a request per session to a domain the platform does not control.
 *
 * The board prints its own weight ladder — Thin 100, Light 300, Regular 400,
 * Medium 500, Semibold 600 — and every one is used: Light carries the headings,
 * Regular the body, Medium the labels and controls, Semibold the primary button
 * and Heading 3.
 */
const inter = Inter({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata = {
  title: "Verity",
  description: "The operating backbone for modern businesses",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // Never block zoom; some users need it and the layout does not depend on it.
  maximumScale: 5,
  themeColor: [
    // The board's own page grounds: Sand 100 light, Neutral 900 dark. This is
    // the colour the OS paints around the viewport, so a mismatch shows as a
    // seam at the top of a phone screen.
    { media: "(prefers-color-scheme: light)", color: "#fff7e6" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1115" },
  ],
};

/**
 * Resolve the theme before the first byte, not before the first paint.
 *
 * The preference lives in a cookie so the SERVER can stamp it, which is what
 * removes the inline theme script this file used to carry. That script read
 * localStorage and set `data-theme` ahead of rendering; it worked, but React
 * re-creates a script element on every client render — where an inline script
 * can never execute — and reports it as "Encountered a script tag while
 * rendering React component" on every load in development. No placement avoids
 * that; the element itself is the problem.
 *
 * `undefined` is a real answer here and means "follow the operating system".
 * The stylesheet handles that case with `color-scheme: light dark`, so an
 * unstamped document is already correct with no JavaScript at all.
 */
type Theme = "light" | "dark";

async function storedTheme(): Promise<Theme | undefined> {
  const value = (await cookies()).get("verity-theme")?.value;
  return value === "light" || value === "dark" ? value : undefined;
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const theme = await storedTheme();

  return (
    // The font variables go on <html>, not <body>. Tailwind v4 emits theme
    // variables onto :root, so a font variable scoped to body is invisible to
    // any rule that resolves against the root — which is how this shipped as
    // Times once already.
    //
    // `suppressHydrationWarning` is NOT about the theme — the server and client
    // now agree on `data-theme`, because it comes from a cookie both can see.
    // It is here because browser extensions rewrite the root element before
    // React hydrates: Dark Reader adds `data-darkreader-mode`,
    // `data-darkreader-scheme` and `data-darkreader-proxy-injected`, and
    // similar tools add their own. Those attributes are outside our control and
    // would otherwise report as a hydration mismatch on every load, for every
    // user running such an extension. This is the attribute's intended use.
    <html
      lang="en"
      data-theme={theme}
      className={`${inter.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* First stop for a keyboard user on every page. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-3 focus:left-3 focus:bg-surface focus:text-text focus:px-4 focus:py-2 focus:rounded-md focus:border focus:border-line-strong focus:shadow-md"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
