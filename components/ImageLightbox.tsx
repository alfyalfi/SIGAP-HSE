"use client";

import { useEffect } from "react";

type ImageLightboxProps = {
  open: boolean;
  src: string;
  alt: string;
  title?: string;
  subtitle?: string;
  onClose: () => void;
};

export function ImageLightbox({ open, src, alt, title, subtitle, onClose }: ImageLightboxProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={title || alt} onClick={onClose}>
      <div className="image-lightbox-shell" onClick={(event) => event.stopPropagation()}>
        <div className="image-lightbox-head">
          <div>
            {title ? <div className="image-lightbox-title">{title}</div> : null}
            {subtitle ? <div className="image-lightbox-subtitle">{subtitle}</div> : null}
          </div>
          <button type="button" className="image-lightbox-close" onClick={onClose} aria-label="Tutup">
            ×
          </button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="image-lightbox-img" />
      </div>
    </div>
  );
}
