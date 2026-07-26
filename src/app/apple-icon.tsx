import { ImageResponse } from "next/og";
import { BRAND_ACCENT } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * The Verity mark on a dark plate. Generated rather than shipped as a PNG so
 * the icon can never drift from the logo component.
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
          background: "#151517",
        }}
      >
        <svg width="120" height="84" viewBox="0 0 100 70" fill="none">
          <path
            d="M 16,16 L 43,54"
            stroke="#FFFFFF"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 43,54 L 84,10"
            stroke={BRAND_ACCENT}
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    size,
  );
}
