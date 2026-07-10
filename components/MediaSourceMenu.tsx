"use client";

import { useEffect, useId, useRef, useState } from "react";

type MediaSourceMenuProps = {
  label: string;
  helperText?: string;
  mainLabel?: string;
  cameraLabel?: string;
  galleryLabel?: string;
  onMainClick: () => void;
  onCameraClick: () => void;
  onGalleryClick: () => void;
  disabled?: boolean;
};

export function MediaSourceMenu({
  label,
  helperText,
  mainLabel = "Upload Foto",
  cameraLabel = "Buka Kamera",
  galleryLabel = "Buka Galeri",
  onMainClick,
  onCameraClick,
  onGalleryClick,
  disabled = false,
}: MediaSourceMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    function onDocumentPointerDown(event: MouseEvent | PointerEvent) {
      if (!rootRef.current) return;
      if (event.target instanceof Node && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function onDocumentKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onDocumentPointerDown);
    document.addEventListener("keydown", onDocumentKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onDocumentPointerDown);
      document.removeEventListener("keydown", onDocumentKeyDown);
    };
  }, []);

  return (
    <div className="media-source-menu" ref={rootRef}>
      <span className="media-source-menu-label">{label}</span>
      <div className="media-source-menu-split">
        <button
          type="button"
          className="media-source-menu-main"
          onClick={onMainClick}
          disabled={disabled}
        >
          <span className="media-source-menu-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </span>
          <span>{mainLabel}</span>
        </button>
        <button
          type="button"
          className="media-source-menu-toggle"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((prev) => !prev)}
          disabled={disabled}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {open && !disabled && (
          <div className="media-source-menu-dropdown" id={menuId} role="menu">
            <button
              type="button"
              className="media-source-menu-item"
              onClick={() => {
                setOpen(false);
                onCameraClick();
              }}
            >
              <span className="media-source-menu-item-icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
              </span>
              <span>
                <strong>{cameraLabel}</strong>
                <small>Gunakan kamera perangkat</small>
              </span>
            </button>
            <button
              type="button"
              className="media-source-menu-item"
              onClick={() => {
                setOpen(false);
                onGalleryClick();
              }}
            >
              <span className="media-source-menu-item-icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14" />
                  <path d="m4 15 5-5 4 4 3-3 4 4" />
                  <path d="M7 9h.01" />
                </svg>
              </span>
              <span>
                <strong>{galleryLabel}</strong>
                <small>Pilih dari file foto yang sudah ada</small>
              </span>
            </button>
          </div>
        )}
      </div>
      {helperText ? <small className="media-source-menu-help">{helperText}</small> : null}
    </div>
  );
}
