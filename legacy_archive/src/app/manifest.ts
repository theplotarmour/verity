import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VerityAI",
    short_name: "VerityAI",
    description:
      "The universal operations platform for service and production businesses — workforce, work orders, quality, inventory and billing in one system.",
    start_url: "/",
    display: "standalone",
    // Dark is the default identity, not a preference. An installed PWA paints
    // this colour before any CSS loads, so a light value here produces a white
    // flash on every cold start.
    background_color: "#000000",
    theme_color: "#FF1D2A",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
