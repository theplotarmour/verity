import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Verity Factory QC PWA",
    short_name: "Verity",
    description:
      "Digital quality inspections for factories with worker, inspector, and owner workflows.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f8fd",
    theme_color: "#0b4db8",
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
