"use client";

import { useEffect } from "react";
import { formatErrorMessage, normalizeError } from "@/lib/errors";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const normalized = normalizeError(error, "Aplikasi mengalami gangguan.", "APP");

  return (
    <div className="auth-screen active">
      <div className="auth-wrap" style={{ gridTemplateColumns: "1fr", maxWidth: 480 }}>
        <div className="auth-card card">
          <span className="eyebrow">SIGAP EHS</span>
          <h1 style={{ marginTop: 8, marginBottom: 8 }}>Terjadi Kesalahan</h1>
          <p className="muted" style={{ marginBottom: 20 }}>
            {formatErrorMessage(error, "Aplikasi mengalami gangguan. Silakan coba lagi atau kembali ke halaman login.", "APP")}
          </p>
          <p className="eyebrow" style={{ marginBottom: 16 }}>
            Error ID: {normalized.errorId}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="button button-primary" onClick={reset}>
              Coba Lagi
            </button>
            <a href="/login" className="button button-secondary">
              Ke Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
