import { ImageResponse } from "next/og";
import { BRAND_ACCENT } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * The Verity mark on a near-black plate. Generated rather than shipped as a PNG
 * so the icon can never drift from `VerityLogo` — the two used to draw entirely
 * different shapes.
 *
 * Flat fills rather than the logo's gradients: Satori's SVG support does not
 * cover gradient defs reliably, and a favicon that renders as a black square on
 * one platform is worse than one without the sheen.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0A0B",
        }}
      >
        <svg width="132" height="95" viewBox="240 230 780 780" fill="none">
          <path
            d="M 1236,258 L 1018,258 C 834,290 688,420 654,560 C 742,462 852,414 932,406 L 606,996 Z"
            fill="#3A3F47"
          />
          <path
            d="M 18,258 L 236,258 C 420,290 566,420 600,560 C 512,462 402,414 322,406 L 648,968 Z"
            fill={BRAND_ACCENT}
          />
        </svg>
      </div>
    ),
    size,
  );
}
