import Link from "next/link";

export default function NotFound() {
  return (
    <div className="auth-screen active">
      <div className="auth-wrap" style={{ gridTemplateColumns: "1fr", maxWidth: 480 }}>
        <div className="auth-card card">
          <span className="eyebrow">404</span>
          <h1 style={{ marginTop: 8, marginBottom: 8 }}>Halaman Tidak Ditemukan</h1>
          <p className="muted" style={{ marginBottom: 20 }}>
            URL yang Anda buka tidak ada atau sudah dipindahkan.
          </p>
          <Link href="/" className="button button-primary">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
