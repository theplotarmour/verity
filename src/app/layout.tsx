import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari, Sora } from "next/font/google";
import { RootProviders } from "@/components/providers/root-providers";
import { CursorGlow } from "@/components/ui/cursor-glow";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// The brand display face. Body copy stays on Inter — Sora is a display type
// and sets badly at 12px, which is most of this product.
const sora = Sora({
  variable: "--font-sora",
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-sans-devanagari",
  weight: ["400", "500", "600", "700"],
  subsets: ["devanagari"],
});

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
      className={`${inter.variable} ${sora.variable} ${notoSansDevanagari.variable} min-h-screen overflow-x-hidden scroll-smooth`}
    >
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
