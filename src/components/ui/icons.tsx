/**
 * The Verity icon set.
 *
 * Authority: the identity board's ICON STYLE row — thin single-weight line
 * geometry on a 24×24 field, 1.4 stroke, round caps and joins. Path data is
 * taken from the design source rather than substituted from an icon library,
 * because a library's optical weight will not match the board's and mixing two
 * families is the fastest way to make an interface look assembled from parts.
 *
 * WHY A CLOSED SET, AND WHY THE PLATFORM OWNS IT
 * A capability picks an icon by NAME; it never ships SVG. That keeps the
 * platform capability-agnostic (it does not know what "Evidence" looks like)
 * while keeping the icon set a design-system concern (a capability cannot
 * introduce a filled cartoon glyph into the rail). Adding an icon is a design
 * system change, which is the correct place to make one.
 *
 * The brand symbol is NOT in this set. It lives in `brand/VerityMark` and is
 * never used as a generic glyph — the board's hourglass is the identity, not a
 * loading spinner.
 */

export type IconName =
  | "overview"
  | "workspace"
  | "locations"
  | "assets"
  | "schedule"
  | "evidence"
  | "approvals"
  | "capabilities"
  | "configuration"
  | "audit"
  | "search"
  | "bell"
  | "collapse"
  | "expand"
  | "signOut"
  | "sun"
  | "moon"
  | "system"
  | "chevronDown"
  | "chevronRight"
  | "building"
  | "check"
  | "close";

const PATHS: Record<IconName, string> = {
  // Navigation — board nav geometry.
  overview: "M4 11l8-6 8 6v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z",
  workspace: "M4 7h4M4 12h4M4 17h4M11 7h9M11 12h9M11 17h9",
  locations:
    "M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10zM12 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  assets: "M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9",
  schedule: "M4 6h16v14H4zM4 10h16M9 4v4M15 4v4",
  // Evidence is the board's "reports" document glyph: a page with a folded
  // corner. Evidence is captured record, and that reads correctly.
  evidence: "M6 4h9l4 4v12H6zM14 4v5h5",
  // Approvals is the board's "compliance" shield — a decision that vouches.
  approvals: "M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z",
  capabilities: "M12 3l8 4.5v9L12 21l-8-4.5v-9z",
  configuration:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4.5 12l-1-2 2-3 2.3.6 1.7-1L10 4h4l.5 2.6 1.7 1 2.3-.6 2 3-1 2 1 2-2 3-2.3-.6-1.7 1L14 20h-4l-.5-2.6-1.7-1L5.5 17l-2-3z",
  audit: "M5 19V9M10 19V5M15 19v-7M20 19v-3",

  // Chrome.
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16.5 16.5L21 21",
  bell: "M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6M10.5 20a2 2 0 0 0 3 0",
  collapse: "M15 6l-6 6 6 6",
  expand: "M9 6l6 6-6 6",
  signOut: "M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 8l-4 4 4 4M6 12h9",
  sun: "M12 5V3M12 21v-2M5 12H3M21 12h-2M6.3 6.3L4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  moon: "M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z",
  system: "M4 5h16v10H4zM9 19h6M12 15v4",
  chevronDown: "M6 9l6 6 6-6",
  chevronRight: "M9 6l6 6-6 6",
  building: "M5 20V8l7-4 7 4v12M10 20v-5h4v5",
  check: "M5 12.5l4.5 4.5L19 7.5",
  close: "M6 6l12 12M18 6L6 18",
};

export function Icon({
  name,
  size = 16.5,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flex: "none" }}
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Narrows an arbitrary string to an icon this set actually ships. */
export function isIconName(value: string | undefined): value is IconName {
  return value !== undefined && value in PATHS;
}
