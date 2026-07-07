"use client";

import { useEffect } from "react";

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

  return (
    <div className="auth-screen active">
      <div className="auth-wrap" style={{ gridTemplateColumns: "1fr", maxWidth: 480 }}>
        <div className="auth-card card">
          <span className="eyebrow">SIGAP HSE</span>
          <h1 style={{ marginTop: 8, marginBottom: 8 }}>Terjadi Kesalahan</h1>
          <p className="muted" style={{ marginBottom: 20 }}>
            Aplikasi mengalami gangguan. Silakan coba lagi atau kembali ke halaman login.
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
