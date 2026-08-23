import type { ReactNode } from "react";
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
 * Only the weights the board actually uses are requested — Thin 200 through
 * Medium 500. There is no bold: the board builds hierarchy from size, spacing
 * and position, and shipping a weight nothing references is dead payload.
 */
const inter = Inter({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
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
    { media: "(prefers-color-scheme: light)", color: "#f4f4f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0f" },
  ],
};

/**
 * Resolve the theme before first paint.
 *
 * This runs synchronously in the head, ahead of any rendering, because a theme
 * applied after hydration shows the wrong one first — a white flash on every
 * navigation for anyone using dark mode. It stamps a RESOLVED value ("light" or
 * "dark", never "system") so the stylesheet needs exactly one dark block.
 */
const themeScript = `(function(){try{
var s=localStorage.getItem("verity-theme")||"system";
var d=s==="dark"||(s==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.setAttribute("data-theme",d?"dark":"light");
}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The font variables go on <html>, not <body>. Tailwind v4 emits theme
    // variables onto :root, so a font variable scoped to body is invisible to
    // any rule that resolves against the root — which is how this shipped as
    // Times once already.
    <html lang="en" className={`${inter.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
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
