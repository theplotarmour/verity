import { ImageResponse } from "next/og";
import { BRAND_ACCENT } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * The Verity mark on a near-black plate. Generated rather than shipped as a PNG
 * so the icon can never drift from `VerityLogo` — the two used to draw
 * different shapes entirely.
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
        <svg width="120" height="99" viewBox="0 0 120 100" fill="none">
          <path d="M 6,6 L 30,6 L 60,94 Z" fill={BRAND_ACCENT} />
          <path d="M 116,4 L 60,94 L 88,4 Z" fill="#9CA3AF" />
        </svg>
      </div>
    ),
    size,
  );
}
