"use client";

import { useState } from "react";
import { ADMIN_PIN_MAX, ADMIN_PIN_MIN, isValidAdminPin } from "@/lib/pin";

type AdminPinModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (pin: string) => void | Promise<void>;
};

export function AdminPinModal({
  open,
  title,
  message,
  confirmLabel = "Konfirmasi",
  busy = false,
  onClose,
  onConfirm,
}: AdminPinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidAdminPin(pin)) {
      setError(`PIN harus ${ADMIN_PIN_MIN}-${ADMIN_PIN_MAX} digit angka.`);
      return;
    }
    setError("");
    await onConfirm(pin);
  }

  function handleClose() {
    setPin("");
    setError("");
    onClose();
  }

  return (
    <div className="admin-overlay" onClick={handleClose}>
      <div className="admin-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="admin-detail-top">
          <div className="admin-modal-title">{title}</div>
          <button type="button" className="admin-modal-close" onClick={handleClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 22 }}>
          <p className="muted" style={{ marginBottom: 16, fontSize: 13, lineHeight: 1.6 }}>
            {message}
          </p>
          <div className="admin-field full">
            <label>PIN Admin</label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              minLength={ADMIN_PIN_MIN}
              maxLength={ADMIN_PIN_MAX}
              placeholder={`${ADMIN_PIN_MIN}-${ADMIN_PIN_MAX} digit`}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, ADMIN_PIN_MAX))}
              required
            />
          </div>
          {error && (
            <p style={{ color: "var(--accent-red)", fontSize: 12, marginTop: 10 }}>{error}</p>
          )}
          <div className="admin-modal-foot" style={{ padding: "16px 0 0", margin: 0 }}>
            <button type="button" className="admin-btn" onClick={handleClose} disabled={busy}>
              Batal
            </button>
            <button type="submit" className="admin-btn admin-btn-danger" disabled={busy}>
              {busy ? "Memproses..." : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
