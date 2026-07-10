import { ImageResponse } from "next/og";
import { OgImage } from "@/components/OgImage";

export const runtime = "edge";
export const alt = "SIGAP";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <OgImage
        title="SIGAP"
        subtitle="Share-ready open graph image untuk aplikasi analisa dan pelaporan temuan EHS."
        footer="Sistem Informasi Guna Analisa dan Pelaporan"
      />
    ),
    size
  );
}
