"use client";

import { useEffect, useMemo, useState } from "react";
import type { Finding, Profile } from "@/lib/queries";
import type { AdminDataProps } from "./AdminDashboard";
import { MobileRecordCard } from "../MobileRecordCard";
import { AdminPinModal } from "./AdminPinModal";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compress";
import { PROFILE_LOGO_BUCKET } from "@/lib/queries";
import { displayErrorMessage } from "@/lib/errors";

type PicRow = Profile & {
  total: number;
  open: number;
  progress: number;
  closed: number;
  rate: number;
};

type PicAddPayload = {
  full_name: string;
  email: string;
  role: string;
  pin: string;
};

type PicCreateResult = Profile & {
  email?: string;
  tempPassword?: string;
};

type AdminMasterPicProps = AdminDataProps & {
  onPicAdd?: (payload: PicAddPayload) => Promise<PicCreateResult | void> | PicCreateResult | void;
  onPicEdit?: (
    id: string,
    payload: { full_name: string; logoPath?: string | null }
  ) => void | Promise<void>;
  onPicDelete?: (id: string, pin: string) => void | Promise<void>;
};

function buildPicRows(findings: Finding[], profiles: Profile[]): PicRow[] {
  return profiles
    .filter((p) => p.role !== "admin" && p.is_active !== false)
    .map((p) => {
      const mine = findings.filter((f) => f.createdBy === p.id);
      const open = mine.filter((f) => f.status === "open").length;
      const progress = mine.filter((f) => f.status === "progress").length;
      const closed = mine.filter((f) => f.status === "closed").length;
      const total = mine.length;
      return {
        ...p,
        total,
        open,
        progress,
        closed,
        rate: total ? Math.round((closed / total) * 100) : 0,
      };
    });
}

export function AdminMasterPic({
  findings,
  profiles,
  onPicAdd,
  onPicEdit,
  onPicDelete,
}: AdminMasterPicProps) {
  const supabase = createClient();
  const [localProfiles, setLocalProfiles] = useState(profiles);

  useEffect(() => {
    setLocalProfiles(profiles);
  }, [profiles]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("field_staff");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);

  const rows = useMemo(() => buildPicRows(findings, localProfiles), [findings, localProfiles]);

  const totals = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.total, 0);
    const closed = rows.reduce((s, r) => s + r.closed, 0);
    const rate = total ? Math.round((closed / total) * 100) : 0;
    return { picCount: rows.length, total, rate };
  }, [rows]);

  function resetModalState() {
    setModalOpen(false);
    setEditing(null);
    setName("");
    setEmail("");
    setRole("field_staff");
    setLogoFile(null);
    setLogoPreview("");
    setPin("");
    setError("");
    setBusy(false);
  }

  function openAdd() {
    setEditing(null);
    setName("");
    setEmail("");
    setRole("field_staff");
    setLogoFile(null);
    setLogoPreview("");
    setPin("");
    setError("");
    setModalOpen(true);
  }

  function openEdit(p: Profile) {
    setEditing(p);
    setName(p.full_name || "");
    setEmail("");
    setRole(p.role || "field_staff");
    setLogoFile(null);
    setLogoPreview(p.logoUrl || "");
    setPin("");
    setError("");
    setModalOpen(true);
  }

  async function uploadLogo(currentLogoPath: string | null) {
    if (!logoFile || !editing) return currentLogoPath;

    const blob = await compressImage(logoFile);
    const nextPath = `${editing.id}/logo-${Date.now()}.webp`;
    const { error: uploadError } = await supabase.storage
      .from(PROFILE_LOGO_BUCKET)
      .upload(nextPath, blob, { contentType: "image/webp", upsert: false });
    if (uploadError) throw uploadError;

    if (currentLogoPath && currentLogoPath !== nextPath) {
      await supabase.storage.from(PROFILE_LOGO_BUCKET).remove([currentLogoPath]).catch(() => undefined);
    }

    return nextPath;
  }

  async function handleAdd() {
    if (!name.trim() || !email.trim() || !pin.trim()) return;
    setBusy(true);
    setError("");
    try {
      const created = await onPicAdd?.({
        full_name: name.trim(),
        email: email.trim(),
        role,
        pin,
      });
      if (created && "id" in created) {
        setLocalProfiles((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
      }
      resetModalState();
    } catch (err) {
      setError(displayErrorMessage(err, "Gagal menambah PIC.", "ADMIN"));
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit() {
    if (!editing || !name.trim()) return;
    setBusy(true);
    setError("");
    try {
      let logoPath = editing.logoPath || null;
      logoPath = await uploadLogo(logoPath);

      const updated = (await onPicEdit?.(editing.id, {
        full_name: name.trim(),
        logoPath,
      })) as Profile | void;

      setLocalProfiles((prev) =>
        prev.map((p) =>
          p.id === editing.id
            ? {
                ...p,
                ...(updated || {}),
                full_name: name.trim(),
                role: role || p.role,
                logoPath,
                logoUrl: logoPath
                  ? supabase.storage.from(PROFILE_LOGO_BUCKET).getPublicUrl(logoPath).data.publicUrl
                  : null,
              }
            : p
        )
      );
      resetModalState();
    } catch (err) {
      setError(displayErrorMessage(err, "Gagal menyimpan PIC.", "ADMIN"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteConfirmed(deletePin: string) {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await onPicDelete?.(deleteTarget.id, deletePin);
      setLocalProfiles((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // handled by AdminPinModal
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="admin-stat-strip">
        <div className="admin-stat-box">
          <div className="admin-stat-label">Jumlah PIC</div>
          <div className="admin-stat-val">{totals.picCount}</div>
          <div className="admin-stat-sub">Terdaftar aktif</div>
        </div>
        <div className="admin-stat-box">
          <div className="admin-stat-label">Total Ditangani</div>
          <div className="admin-stat-val">{totals.total}</div>
          <div className="admin-stat-sub">Temuan oleh seluruh PIC</div>
        </div>
        <div className="admin-stat-box">
          <div className="admin-stat-label">Rata-rata Penyelesaian</div>
          <div className="admin-stat-val">{totals.rate}%</div>
          <div className="admin-stat-sub">Tingkat closed keseluruhan</div>
        </div>
        <div className="admin-stat-box" style={{ display: "flex", alignItems: "center" }}>
          <button type="button" className="admin-btn admin-btn-primary" onClick={openAdd}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Tambah PIC
          </button>
        </div>
      </div>

      <div className="admin-table-panel">
        <div className="mobile-only admin-mobile-card-list">
          {rows.length ? (
            rows.map((r) => (
              <MobileRecordCard
                key={r.id}
                title={r.full_name || "PIC"}
                subtitle={r.role === "field_staff" ? "PIC Lapangan" : r.role}
                badge={
                  <span className="mobile-record-chip info">
                    {r.role === "field_staff" ? "PIC Lapangan" : r.role}
                  </span>
                }
                sections={[
                  {
                    title: "Ringkasan PIC",
                    fields: [
                      { label: "Total ditangani", value: r.total },
                      { label: "Open", value: r.open },
                      { label: "On progress", value: r.progress },
                    ],
                  },
                ]}
                detailsLabel="Lihat statistik lengkap"
                detailsSections={[
                  {
                    title: "Detail performa",
                    fields: [
                      { label: "Closed", value: r.closed },
                      { label: "Tingkat penyelesaian", value: `${r.rate}%` },
                    ],
                  },
                ]}
                actions={
                  <div className="mobile-record-card-actions">
                    <button type="button" className="admin-btn" onClick={() => openEdit(r)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger"
                      onClick={() => setDeleteTarget(r)}
                    >
                      Hapus
                    </button>
                  </div>
                }
              />
            ))
          ) : (
            <div className="admin-empty">Belum ada data PIC. Tambahkan PIC baru untuk memulai.</div>
          )}
        </div>

        <div className="desktop-only">
          <table>
            <thead>
              <tr>
                <th>PIC</th>
                <th>Peran</th>
                <th>Total Ditangani</th>
                <th>Open</th>
                <th>On Progress</th>
                <th>Closed</th>
                <th>Tingkat Penyelesaian</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r) => (
                  <tr key={r.id} style={{ cursor: "default" }}>
                    <td>
                      <div className="admin-pic-cell">
                        <span className="admin-pic-avatar">
                          {r.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.logoUrl} alt={r.full_name || "PIC"} />
                          ) : (
                            <span>{(r.full_name || "P").slice(0, 2).toUpperCase()}</span>
                          )}
                        </span>
                        {r.full_name || "-"}
                      </div>
                    </td>
                    <td className="muted">{r.role === "field_staff" ? "PIC Lapangan" : r.role}</td>
                    <td>{r.total}</td>
                    <td>{r.open}</td>
                    <td>{r.progress}</td>
                    <td>{r.closed}</td>
                    <td>
                      <div className="admin-bar-cell">
                        <div className="admin-bar-track">
                          <div className="admin-bar-fill" style={{ width: `${r.rate}%` }} />
                        </div>
                        <span className="mono">{r.rate}%</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm admin-btn-ghost"
                          onClick={() => openEdit(r)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm admin-btn-danger"
                          onClick={() => setDeleteTarget(r)}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="admin-empty">
                    Belum ada data PIC. Tambahkan PIC baru untuk memulai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="admin-overlay" onClick={resetModalState}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-detail-top">
              <div className="admin-modal-title">{editing ? "Edit PIC" : "Tambah PIC Baru"}</div>
              <button type="button" className="admin-modal-close" onClick={resetModalState}>
                ×
              </button>
            </div>
            <div style={{ padding: 22 }}>
              <div className="admin-form-grid">
                <div className="admin-field full">
                  <label>Nama Lengkap PIC</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama penanggung jawab"
                  />
                </div>
                {!editing && (
                  <>
                    <div className="admin-field full">
                      <label>Email PIC</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@perusahaan.com"
                      />
                    </div>
                    <div className="admin-field full">
                      <label>Peran</label>
                      <select value={role} onChange={(e) => setRole(e.target.value)}>
                        <option value="field_staff">PIC Lapangan</option>
                        <option value="hse_officer">HSE Officer</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                    <div className="admin-field full">
                      <label>PIN Admin</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                        placeholder="Masukkan PIN admin"
                      />
                    </div>
                  </>
                )}
                {editing && (
                  <div className="admin-field full">
                    <label>Logo PIC</label>
                    <div className="admin-form-grid" style={{ gridTemplateColumns: "auto 1fr", alignItems: "center" }}>
                      <div className="admin-pic-logo-preview">
                        {logoPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logoPreview} alt="Logo PIC" />
                        ) : (
                          <span className="muted">Logo</span>
                        )}
                      </div>
                      <div>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setLogoFile(file);
                            if (file) {
                              const preview = URL.createObjectURL(file);
                              setLogoPreview(preview);
                            }
                          }}
                        />
                        <p className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                          JPG, PNG, atau WEBP akan dikompresi otomatis agar tetap ringan.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {error && (
                <p style={{ color: "var(--accent-red)", fontSize: 12, marginTop: 14 }}>{error}</p>
              )}
            </div>
            <div className="admin-modal-foot">
              <button type="button" className="admin-btn" onClick={resetModalState} disabled={busy}>
                Batal
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={editing ? handleSaveEdit : handleAdd}
                disabled={busy}
              >
                {busy ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminPinModal
        open={Boolean(deleteTarget)}
        title="Hapus PIC?"
        message={`PIC ${deleteTarget?.full_name || "-"} akan dinonaktifkan dan logo lama dihapus dari storage. Masukkan PIN admin untuk melanjutkan.`}
        confirmLabel="Hapus PIC"
        busy={busy}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirmed}
      />
    </>
  );
}
