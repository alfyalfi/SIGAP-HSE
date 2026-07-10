import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SIGAP",
    short_name: "SIGAP",
    description: "Sistem Informasi Guna Analisa dan Pelaporan temuan EHS.",
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
