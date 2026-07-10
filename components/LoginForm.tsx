"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SIGAP_FULL_NAME } from "@/lib/constants";
import { ADMIN_PIN_MAX, ADMIN_PIN_MIN, isValidAdminPin } from "@/lib/pin";
import { withTimeout } from "@/lib/async-utils";
import { displayErrorMessage } from "@/lib/errors";
import { AppCopyright } from "./AppCopyright";
import { SigapLogo } from "./SigapLogo";
import type { LoginAccount } from "@/lib/queries";

type LoginFormProps = {
  accounts: LoginAccount[];
};

export function LoginForm({ accounts }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"user" | "admin">("user");
  const [accountEmail, setAccountEmail] = useState("");
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "config") {
      setStatus(
        displayErrorMessage(
          null,
          "Environment Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.",
          "AUTH"
        )
      );
    } else if (error === "session") {
      setStatus(displayErrorMessage(null, "Sesi gagal dimuat. Silakan login kembali.", "AUTH"));
    } else if (error === "secrets") {
      setStatus(
        displayErrorMessage(
          null,
          "Server secrets belum dikonfigurasi. Isi SIGAP_DEMO_PASSWORD dan SIGAP_ADMIN_PIN.",
          "AUTH"
        )
      );
    }
  }, [searchParams]);

  async function handleUserLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!accountEmail) return;
    setLoading(true);
    setStatus("Sedang masuk...");
    try {
      const res = await withTimeout(
        fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "user", email: accountEmail }),
        }),
        15000,
        "Login user"
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || displayErrorMessage(null, "Login gagal", "AUTH"));
      router.push("/form");
      router.refresh();
    } catch (err) {
      setStatus(displayErrorMessage(err, "Login gagal", "AUTH"));
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidAdminPin(pin)) {
      setStatus(
        displayErrorMessage(
          null,
          `PIN harus ${ADMIN_PIN_MIN}-${ADMIN_PIN_MAX} digit angka.`,
          "AUTH"
        )
      );
      return;
    }
    setLoading(true);
    setStatus("Memverifikasi PIN...");
    try {
      const res = await withTimeout(
        fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "admin", pin }),
        }),
        15000,
        "Login admin"
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || displayErrorMessage(null, "Login gagal", "AUTH"));
      router.push("/admin/dashboard");
      router.refresh();
    } catch (err) {
      setStatus(displayErrorMessage(err, "Login gagal", "AUTH"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-screen active">
      <div className="auth-wrap">
        <div className="auth-hero auth-hero-desktop">
          <SigapLogo size="xl" priority className="auth-hero-logo" />
          <h1 className="sigap-hero-title">SIGAP</h1>
          <p className="sigap-hero-subtitle">{SIGAP_FULL_NAME}</p>
          <p className="auth-hero-desc">
            Pelaporan temuan EHS, tindak lanjut lapangan, dan approval terpusat untuk seluruh
            perusahaan.
          </p>
        </div>

        <div className="auth-card card">
          <div className="auth-hero-mobile">
            <SigapLogo size="xl" priority className="auth-hero-logo" />
            <div className="auth-mobile-copy">
              <h1 className="sigap-hero-title">SIGAP</h1>
              <p className="sigap-hero-subtitle">{SIGAP_FULL_NAME}</p>
            </div>
            <p className="auth-hero-desc">
              Pelaporan temuan EHS, tindak lanjut lapangan, dan approval terpusat untuk seluruh
              perusahaan.
            </p>
          </div>

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
                <select value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} required>
                  <option value="">- Pilih Perusahaan -</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.email}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="button button-primary button-block" disabled={loading}>
                {loading ? (
                  <>
                    <span className="button-spinner" aria-hidden />
                    Memproses...
                  </>
                ) : (
                  "Masuk"
                )}
              </button>
              <p className="helper-text">Pilih nama PT Anda - tanpa password.</p>
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
                  placeholder={`${ADMIN_PIN_MIN}-${ADMIN_PIN_MAX} digit PIN`}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, ADMIN_PIN_MAX))}
                  required
                />
                <small className="helper-text">
                  Masukkan PIN admin ({ADMIN_PIN_MIN}-{ADMIN_PIN_MAX} digit angka).
                </small>
              </label>
              <button type="submit" className="button button-primary button-block" disabled={loading}>
                {loading ? (
                  <>
                    <span className="button-spinner" aria-hidden />
                    Memverifikasi...
                  </>
                ) : (
                  "Masuk sebagai Admin"
                )}
              </button>
            </form>
          )}

          {status && <p className="helper-text" style={{ color: "var(--accent-red)" }}>{status}</p>}
        </div>
      </div>
      <AppCopyright centered />
    </section>
  );
}
