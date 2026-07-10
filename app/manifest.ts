import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SIGAP EHS",
    short_name: "SIGAP EHS",
    description: "Sistem Informasi Guna Audit dan Penyelesaian temuan EHS.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F4F5F9",
    theme_color: "#14151A",
    orientation: "portrait",
    icons: [
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
