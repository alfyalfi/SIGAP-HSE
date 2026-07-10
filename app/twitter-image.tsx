import { ImageResponse } from "next/og";
import { OgImage } from "@/components/OgImage";

export const runtime = "edge";
export const alt = "SIGAP EHS";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <OgImage
        title="SIGAP EHS"
        subtitle="Share-ready open graph image untuk aplikasi pelaporan dan tindak lanjut temuan EHS."
        footer="Sistem pelaporan dan tindak lanjut temuan K3"
      />
    ),
    size
  );
}
