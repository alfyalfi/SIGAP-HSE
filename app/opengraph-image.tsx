import { ImageResponse } from "next/og";
import { OgImage } from "@/components/OgImage";
import { SIGAP_FULL_NAME } from "@/lib/constants";

export const runtime = "edge";
export const alt = "SIGAP EHS";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <OgImage
        title="SIGAP EHS"
        subtitle="Sistem informasi untuk pelaporan, review, dan penyelesaian temuan EHS dalam satu alur yang rapi."
        footer={SIGAP_FULL_NAME}
      />
    ),
    size
  );
}
