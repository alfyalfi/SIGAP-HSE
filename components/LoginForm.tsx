"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COMPANIES } from "@/lib/constants";

export function LoginForm() {
  const router = useRouter();
  const [tab, setTab] = useState<"user" | "admin">("user");
  const [companyId, setCompanyId] = useState("");
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

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
                  maxLength={6}
                  placeholder="6 digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                />
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
