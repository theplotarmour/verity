import { cn } from "@/lib/utils";

/**
 * The Verity mark.
 *
 * Two swept blades crossing to form the V: scarlet in front, graphite behind,
 * each cut by a concave notch that leaves a talon point. Redrawn as vectors
 * from the brand sheet rather than shipped as a raster — the mark appears at
 * 18px in a sidebar and at 340px in the app icon, and a PNG cannot serve both.
 *
 * `mono` collapses both blades to the current text colour for surfaces where
 * two-tone would fight the background (print, a dense monochrome rail).
 */
export function VerityLogo({
  className,
  size = 48,
  mono = false,
  id = "verity-mark",
}: {
  className?: string;
  /** Width in pixels. Height follows the mark's roughly 1:0.72 aspect. */
  size?: number;
  mono?: boolean;
  /** Gradient ids must be unique when several marks share a page. */
  id?: string;
}) {
  return (
    <svg
      viewBox="240 230 780 780"
      width={size}
      height={size * 0.72}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Verity"
      className={cn("select-none", className)}
    >
      {!mono ? (
        <defs>
          <linearGradient id={`${id}-red`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF2A36" />
            <stop offset="55%" stopColor="#E11D2A" />
            <stop offset="100%" stopColor="#B80D1E" />
          </linearGradient>
          <linearGradient id={`${id}-steel`} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9CDD3" />
            <stop offset="45%" stopColor="#4B5058" />
            <stop offset="100%" stopColor="#1F2328" />
          </linearGradient>
        </defs>
      ) : null}

      {/* Graphite blade — drawn first so the scarlet crosses in front, as on
          the brand sheet. */}
      <path
        d="M 1236,258 L 1018,258 C 834,290 688,420 654,560 C 742,462 852,414 932,406 L 606,996 Z"
        fill={mono ? "currentColor" : `url(#${id}-steel)`}
        opacity={mono ? 0.5 : 1}
      />

      {/* Scarlet blade. */}
      <path
        d="M 18,258 L 236,258 C 420,290 566,420 600,560 C 512,462 402,414 322,406 L 648,968 Z"
        fill={mono ? "currentColor" : `url(#${id}-red)`}
      />
    </svg>
  );
}
