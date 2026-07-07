"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 40, background: "#0f172a", color: "#f8fafc" }}>
        <h1>SIGAP HSE — Kesalahan Sistem</h1>
        <p style={{ color: "#94a3b8", marginBottom: 24 }}>
          {error.message || "Terjadi kesalahan yang tidak terduga."}
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
