import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Devanagari } from "next/font/google";
import { RootProviders } from "@/components/providers/root-providers";
import { BRAND_ACCENT, BRAND_DESCRIPTION, BRAND_FULL_TITLE, BRAND_NAME } from "@/lib/brand";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-sans-devanagari",
  weight: ["400", "500", "600", "700"],
  subsets: ["devanagari"],
});

export const metadata: Metadata = {
  title: {
    default: BRAND_FULL_TITLE,
    template: `%s | ${BRAND_FULL_TITLE}`,
  },
  description: BRAND_DESCRIPTION,
  applicationName: BRAND_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: BRAND_NAME,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: BRAND_ACCENT,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${notoSansDevanagari.variable} min-h-screen overflow-x-hidden scroll-smooth`}
    >
      <body className="min-h-screen overflow-x-hidden bg-background text-text-primary font-sans antialiased">
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
