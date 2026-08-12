import type { Metadata, Viewport } from "next";
import { RootProviders } from "@/components/providers/root-providers";
import { CursorGlow } from "@/components/ui/cursor-glow";
import "./globals.css";

/**
 * The three faces, loaded as a plain stylesheet rather than through
 * `next/font/google`.
 *
 * The loader fetches and self-hosts the files at build time, and under Turbopack
 * that fetch 404s locally and takes the whole build with it — a dev environment
 * that cannot build is worse than a font request.
 *
 * The `--font-*` variables that `next/font` used to inject are now declared in
 * `globals.css`, which is where `--font-sans` and `--font-display` already
 * compose them, so nothing downstream changes.
 *
 * What this costs, honestly: the files are no longer self-hosted, so there is a
 * cross-origin request on first paint and Google sees the visitor's IP. `swap`
 * keeps text visible while it resolves, and `preconnect` opens the connection
 * alongside the HTML rather than after it. Worth revisiting once the loader works
 * under Turbopack, or by vendoring the woff2 files into `public/`.
 */
const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2" +
  "?family=Inter:wght@400;500;600;700" +
  "&family=Sora:wght@400;500;600;700;800" +
  "&family=Noto+Sans+Devanagari:wght@400;500;600;700" +
  "&display=swap";

export const metadata: Metadata = {
  title: {
    default: "VerityAI — Universal Operations OS",
    template: "%s | VerityAI",
  },
  description:
    "The universal operations platform for service and production businesses. From workforce and work orders to production, quality, inventory and billing — one system.",
  applicationName: "VerityAI",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VerityAI",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Locked to 1. An installed PWA that pinch-zooms stops reading as an app,
  // and double-tap zoom on a table cell is the single worst thing that happens
  // on the shop floor.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0B" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // next-themes writes `class` and `style="color-scheme"` onto <html>
      // before React hydrates, so the server and client copies never match.
      // Without this, React treats it as a root-level mismatch, bails out of
      // hydration and client-renders a second copy of the whole document —
      // which is what left two <main> elements in the DOM and the visible one
      // with no event handlers attached.
      suppressHydrationWarning
      className="min-h-screen overflow-x-hidden scroll-smooth"
    >
      <head>
        {/* Two hosts: the stylesheet comes from fonts.googleapis.com, the woff2
            files from fonts.gstatic.com. Preconnecting only the first still leaves
            a fresh TLS handshake in front of the font itself. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
      </head>
      {/* `verity-canvas` paints the fixed backdrop gradients behind everything
          via ::after at z-index -1 — no extra element, and it cannot intercept
          a click. */}
      <body className="verity-canvas min-h-screen overflow-x-hidden bg-background text-text-primary font-sans antialiased">
        <RootProviders>{children}</RootProviders>
        {/* One delegated pointer listener for every glass card on the page. */}
        <CursorGlow />
      </body>
    </html>
  );
}
