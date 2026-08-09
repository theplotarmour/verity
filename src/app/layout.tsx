import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import { RootProviders } from "@/components/providers/root-providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-sans-devanagari",
  weight: ["400", "500", "600", "700"],
  subsets: ["devanagari"],
});

export const metadata: Metadata = {
  title: {
    default: "Verity - Vision For Enterprise Digital Advancement",
    template: "%s | Verity - Vision For Enterprise Digital Advancement",
  },
  description:
    "Premium automotive manufacturing OS for digital QC, approvals, and customer-facing proof reports.",
  applicationName: "Verity",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Verity",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#007AFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${notoSansDevanagari.variable} min-h-screen overflow-x-hidden scroll-smooth`}
    >
      <body className="min-h-screen overflow-x-hidden bg-background text-text-primary font-sans antialiased">
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
