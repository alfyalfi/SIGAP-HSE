"use client";

import { formatErrorMessage, normalizeError } from "@/lib/errors";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const normalized = normalizeError(error, "Terjadi kesalahan sistem.", "SYS");

  return (
    <html lang="id">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: 40,
          background: "#0f172a",
          color: "#f8fafc",
        }}
      >
        <h1>SIGAP HSE - Kesalahan Sistem</h1>
        <p style={{ color: "#94a3b8", marginBottom: 24 }}>
          {formatErrorMessage(error, "Terjadi kesalahan yang tidak terduga.", "SYS")}
        </p>
        <p style={{ color: "#cbd5e1", marginBottom: 24, fontSize: 12 }}>
          Error ID: {normalized.errorId}
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "none",
            background: "#3b82f6",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Muat Ulang
        </button>
      </body>
    </html>
  );
}
