import { cn } from "@/lib/utils";

/**
 * The Verity mark.
 *
 * Two tapering blades meeting at a point: scarlet on the left, silver on the
 * right, forming the V. Drawn rather than shipped as a raster so it stays sharp
 * at every size and picks up the theme — and because the files that used to sit
 * in `public/brand` were a stale zigzag and, in one case, a screenshot of the
 * previous product's error screen.
 *
 * `mono` renders both blades in the current text colour, for places where the
 * two-tone mark would fight the surface (a dense sidebar, a print sheet).
 */
export function VerityLogo({
  className,
  size = 48,
  mono = false,
}: {
  className?: string;
  /** Width in pixels. Height follows the mark's 1.25:1 aspect. */
  size?: number;
  mono?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 120 100"
      width={size}
      height={size * 0.83}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Verity"
      className={cn("select-none", className)}
    >
      {/* Scarlet blade — the descending stroke. */}
      <path
        d="M 6,6 L 30,6 L 60,94 Z"
        fill={mono ? "currentColor" : "var(--brand, #E11D2A)"}
      />
      {/* Silver blade — the rising stroke, carried higher than the scarlet so
          the V reads as moving upward rather than sitting symmetrically. */}
      <path
        d="M 116,4 L 60,94 L 88,4 Z"
        fill={mono ? "currentColor" : "#9CA3AF"}
        opacity={mono ? 0.55 : 1}
      />
    </svg>
  );
}
