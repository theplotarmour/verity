/**
 * The Verity brand mark.
 *
 * Authority: the approved identity assets — `public/37456f41-…png` (the symbol
 * at 1254², supplied directly) and the primary-logo lockup on the identity
 * board.
 *
 * ── THE SYMBOL ─────────────────────────────────────────────────────────────
 * Two rounded triangles meeting at a circular pinch. Not sharp triangles with a
 * gap; the corners carry a real radius and the facing apexes are cut by a
 * circle, and both details are what make it read as an hourglass rather than a
 * bowtie.
 *
 * The path below was not drawn by eye. It was derived by measuring the supplied
 * raster and fitting the construction:
 *
 *   • aspect ratio        0.6922 (w/h)  → 16.613 × 24
 *   • slanted edge        x = 0.84178·y − 2.29246, straight to ±0.02px
 *   • top corner radius   2.0 exactly (solved from the edge tangency)
 *   • pinch circle        centre (8.3064, 12), r = 1.3135
 *   • virtual apex        y = 12.5911 — the triangles overshoot the centre and
 *                         the circle carves the overlap, which is why the
 *                         facing edges are concave rather than pointed
 *
 * Rasterised back and compared pixel-for-pixel against the supplied asset, this
 * path disagrees on **0.47%** of samples — entirely anti-aliasing at the edges.
 *
 * Do not adjust these numbers, add a stroke, rotate, or apply effects. The
 * geometry is verified in `e2e/brand.spec.ts`.
 *
 * ── THE WORDMARK ───────────────────────────────────────────────────────────
 * "verity" is set in a geometric face that is NOT Inter — Inter is the UI
 * typeface, not the logotype. Reproducing it with a font would be an
 * approximation, so the approved artwork itself is used, as an alpha mask
 * painted with `currentColor`. That keeps it pixel-exact to what was signed off
 * while still inheriting the theme's ink colour in light and dark.
 */

/** Symbol aspect: width ÷ height, measured from the supplied asset. */
const SYMBOL_RATIO = 0.6922;
/** Wordmark aspect: width ÷ height of its cap-height box. */
const WORDMARK_RATIO = 2.7854;
/** Lockup metrics, measured from the primary logo: symbol is shorter than the
 *  wordmark box, they are centred on each other, and the gap scales with the
 *  wordmark rather than being a fixed pixel value. */
const LOCKUP_SYMBOL_SCALE = 0.865;
const LOCKUP_GAP_SCALE = 0.38;

const TOP =
  "M 2 0 H 14.613 A 2 2 0 0 1 16.1432 3.288 L 9.4078 11.283 " +
  "A 1.3135 1.3135 0 0 0 7.2052 11.283 L 0.4698 3.288 A 2 2 0 0 1 2 0 Z";
const BOTTOM =
  "M 2 24 H 14.613 A 2 2 0 0 0 16.1432 20.712 L 9.4078 12.717 " +
  "A 1.3135 1.3135 0 0 1 7.2052 12.717 L 0.4698 20.712 A 2 2 0 0 0 2 24 Z";

/** `size` is the mark's HEIGHT; width follows from the fixed aspect. */
export function VeritySymbol({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size * SYMBOL_RATIO}
      height={size}
      viewBox="0 0 16.613 24"
      className={className}
      style={{ flex: "none", display: "block" }}
      aria-hidden="true"
      focusable="false"
    >
      <path d={TOP} fill="currentColor" />
      <path d={BOTTOM} fill="currentColor" />
    </svg>
  );
}

/**
 * The wordmark, as the approved artwork rather than as type.
 *
 * `currentColor` paints through a mask, so the logotype recolours with the
 * surrounding text and needs no light/dark variant files.
 */
export function VerityWordmark({ size = 20, className }: { size?: number; className?: string }) {
  const url = "url(/brand/verity-wordmark.png)";
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        display: "block",
        flex: "none",
        width: size * WORDMARK_RATIO,
        height: size,
        backgroundColor: "currentColor",
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskSize: "100% 100%",
        maskSize: "100% 100%",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
      }}
    />
  );
}

/**
 * Symbol + wordmark in the board's primary lockup.
 *
 * `size` is the WORDMARK height, because that is what the eye reads as the
 * logo's size; the symbol and gap derive from it at the measured ratios.
 *
 * MONOCHROME, both halves. The brand sheet gives the mark exactly three
 * variations — dark on white, white on dark, dark on mint — and none of them
 * paints the symbol in the interface's accent. An earlier revision rendered the
 * symbol `text-accent`, which made the identity a function of a theme setting:
 * change the accent preset and the logo changed with it. ADR-012 §2 ends that.
 * Both halves now take `currentColor`, so the lockup inherits whatever ink the
 * surface sets and stays one colour on every preset.
 */
export function VerityLockup({
  collapsed = false,
  size = 20,
  className,
}: {
  collapsed?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: collapsed ? 0 : size * LOCKUP_GAP_SCALE,
      }}
    >
      <VeritySymbol size={size * LOCKUP_SYMBOL_SCALE} />
      {!collapsed && <VerityWordmark size={size} />}
      <span className="sr-only">Verity</span>
    </span>
  );
}
