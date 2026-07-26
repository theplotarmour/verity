// Single source of truth for Verity's brand surface. Anything user-visible that
// names or colours the product reads from here, so a future reskin is one edit.

export const BRAND_NAME = "Verity";
export const BRAND_TAGLINE = "Verified Manufacturing Intelligence";
export const BRAND_FULL_TITLE = `${BRAND_NAME} - ${BRAND_TAGLINE}`;

export const BRAND_DESCRIPTION =
  "Premium manufacturing OS for digital QC, approvals, and customer-facing proof reports.";

/**
 * Public workspace URL used in invites, PIN resets and passport share links.
 * These were previously three hardcoded strings pointing at two different
 * hosts; they now resolve from one env-driven value.
 */
export const BRAND_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://verity.theverityai.xyz";

/**
 * Default accent. Factories may override this per-workspace via settings, so
 * treat it as the fallback rather than a constant to compare against.
 *
 * Deliberately indigo: green and red are load-bearing pass/fail semantics
 * across QC, and a brand colour in either family reads as a verdict.
 */
export const BRAND_ACCENT = "#4C3FE4";

/** Lifted for dark surfaces so white label text still clears 4.5:1 on the fill. */
export const BRAND_ACCENT_DARK = "#6D5AF5";

/** PWA install/splash chrome. */
export const BRAND_BACKGROUND = "#F5F5F7";
