"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { COMPANIES } from "@/lib/constants";
import { ADMIN_PIN_MAX, ADMIN_PIN_MIN, isValidAdminPin } from "@/lib/pin";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"user" | "admin">("user");
  const [companyId, setCompanyId] = useState("");
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "config") {
      setStatus("Environment Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    } else if (error === "session") {
      setStatus("Sesi gagal dimuat. Silakan login kembali.");
    } else if (error === "secrets") {
      setStatus("Server secrets belum dikonfigurasi. Isi SIGAP_DEMO_PASSWORD dan SIGAP_ADMIN_PIN.");
    }
  }, [searchParams]);

  async function handleUserLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    setLoading(true);
    setStatus("Sedang masuk...");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "user", companyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login gagal");
      router.push("/form");
      router.refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidAdminPin(pin)) {
      setStatus(`PIN harus ${ADMIN_PIN_MIN}–${ADMIN_PIN_MAX} digit angka.`);
      return;
    }
    setLoading(true);
    setStatus("Memverifikasi PIN...");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "admin", pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login gagal");
      router.push("/admin/dashboard");
      router.refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-screen active">
      <div className="auth-wrap">
        <div className="auth-hero">
          <span className="eyebrow">SIGAP HSE</span>
          <h1>Sistem Pelaporan & Tindak Lanjut Temuan HSE</h1>
          <p>Input temuan lapangan, pantau progres perbaikan, dan kelola approval secara terpusat.</p>
        </div>
        <div className="auth-card card">
          <div className="login-tabs">
            <button
              type="button"
              className={`login-tab${tab === "user" ? " active" : ""}`}
              onClick={() => setTab("user")}
            >
              User / PIC
            </button>
            <button
              type="button"
              className={`login-tab${tab === "admin" ? " active" : ""}`}
              onClick={() => setTab("admin")}
            >
              Admin
            </button>
          </div>

          {tab === "user" ? (
            <form className="auth-form login-panel active" onSubmit={handleUserLogin}>
              <label>
                <span>Pilih Perusahaan (PIC)</span>
                <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
                  <option value="">— Pilih Perusahaan —</option>
                  {COMPANIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <button type="submit" className="button button-primary button-block" disabled={loading}>
                Masuk
              </button>
              <p className="helper-text">Pilih nama PT Anda — tanpa password.</p>
            </form>
          ) : (
            <form className="auth-form login-panel active" onSubmit={handleAdminLogin}>
              <label>
                <span>Email Admin</span>
                <input type="email" value="admin@sigap.com" readOnly />
              </label>
              <label>
                <span>PIN</span>
                <input
                  type="password"
                  inputMode="numeric"
                  minLength={ADMIN_PIN_MIN}
                  maxLength={ADMIN_PIN_MAX}
                  pattern="[0-9]{6,8}"
                  placeholder={`${ADMIN_PIN_MIN}–${ADMIN_PIN_MAX} digit PIN`}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, ADMIN_PIN_MAX))}
                  required
                />
                <small className="helper-text">Masukkan PIN admin ({ADMIN_PIN_MIN}–{ADMIN_PIN_MAX} digit angka).</small>
              </label>
              <button type="submit" className="button button-primary button-block" disabled={loading}>
                Masuk sebagai Admin
              </button>
            </form>
          )}

          {status && <p className="helper-text" style={{ color: "var(--accent-red)" }}>{status}</p>}
        </div>
      </div>
    </section>
  );
}
