import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SIGAP HSE",
    short_name: "SIGAP HSE",
    description: "Sistem Informasi Guna Audit dan Penyelesaian temuan HSE.",
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
