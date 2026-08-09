// Single source of truth for Verity's brand surface. Anything user-visible that
// names or colours the product reads from here, so a future reskin is one edit.

export const BRAND_NAME = "Verity";
export const BRAND_TAGLINE = "Operate • Automate • Evolve";
export const BRAND_FULL_TITLE = `${BRAND_NAME}AI — Universal Operations OS`;

export const BRAND_DESCRIPTION =
  "The universal operations platform for service and production businesses — workforce, work orders, quality, inventory and billing in one system.";

/**
 * Public workspace URL used in invites, PIN resets and passport share links.
 * These were previously three hardcoded strings pointing at two different
 * hosts; they now resolve from one env-driven value.
 */
export const BRAND_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://app.theverityai.xyz";

/**
 * Default accent — brand scarlet. Factories may override this per-workspace via
 * settings, so treat it as the fallback rather than a constant to compare
 * against.
 *
 * This was indigo, on the reasoning that a red brand colour would be confused
 * with a QC failure. The brand is red, so the separation is made the other way
 * instead: error states are pushed warm and orange (see globals.css), and a
 * verdict is carried by its icon and fill rather than by hue alone.
 */
export const BRAND_ACCENT = "#E11D2A";

/** Lifted for dark surfaces, where the deeper scarlet muddies. */
export const BRAND_ACCENT_DARK = "#FF1D2A";

/** PWA install/splash chrome. Dark is the default identity. */
export const BRAND_BACKGROUND = "#0A0A0B";
