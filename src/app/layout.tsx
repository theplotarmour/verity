import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Verity",
  description: "Module-driven business operating platform",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // Never block zoom; some users need it and the layout does not depend on it.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* First stop for a keyboard user on every page. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-3 focus:left-3 focus:bg-surface focus:text-text focus:px-4 focus:py-2 focus:rounded-md focus:border focus:border-line-strong"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
