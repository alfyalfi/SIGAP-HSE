"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Finding, Profile } from "@/lib/queries";
import type { AdminDataProps } from "./AdminDashboard";
import { MobileRecordCard } from "../MobileRecordCard";
import { AdminPinModal } from "./AdminPinModal";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compress";
import { PROFILE_LOGO_BUCKET } from "@/lib/queries";
import { displayErrorMessage } from "@/lib/errors";
import { MediaSourceMenu } from "../MediaSourceMenu";
import { ImageLightbox } from "../ImageLightbox";
import { assertImageWithinLimit } from "@/lib/image";

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
  ) => Promise<Profile | void> | Profile | void;
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
  const [supabase] = useState(() => createClient());
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
  const [logoViewer, setLogoViewer] = useState<{ src: string; title: string } | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (logoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

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
    setLogoViewer(null);
    setPin("");
    setError("");
    setBusy(false);
  }

  function setPreviewFromFile(file: File | null) {
    if (!file) return;
    void (async () => {
      try {
        await assertImageWithinLimit(file, 7680);
        setLogoFile(file);
        setLogoPreview((prev) => {
          if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
          return URL.createObjectURL(file);
        });
        setError("");
      } catch (err) {
        const message = displayErrorMessage(err, "Ukuran foto terlalu besar.", "ADMIN");
        setError(message);
      }
    })();
  }

  function openLogoPicker(source: "camera" | "gallery") {
    if (source === "camera") {
      cameraInputRef.current?.click();
      return;
    }
    galleryInputRef.current?.click();
  }

  function openLogoViewer(src: string, title: string) {
    setLogoViewer({ src, title });
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

  async function uploadLogo(profileId: string, currentLogoPath: string | null) {
    if (!logoFile) return currentLogoPath;

    const blob = await compressImage(logoFile);
    const nextPath = `${profileId}/logo-${Date.now()}.webp`;
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
        let merged = created;
        if (logoFile) {
          const logoPath = await uploadLogo(created.id, created.logoPath || null);
          const synced = (await onPicEdit?.(created.id, {
            full_name: created.full_name || name.trim(),
            logoPath,
          })) as Profile | void;
          merged = {
            ...created,
            ...(synced || {}),
            full_name: (synced && synced.full_name) || created.full_name || name.trim(),
            logoPath,
            logoUrl: logoPath
              ? supabase.storage.from(PROFILE_LOGO_BUCKET).getPublicUrl(logoPath).data.publicUrl
              : null,
          };
        }
        setLocalProfiles((prev) => [merged, ...prev.filter((p) => p.id !== merged.id)]);
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
      logoPath = await uploadLogo(editing.id, logoPath);

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
                        {r.logoUrl ? (
                          <button
                            type="button"
                            className="admin-pic-avatar"
                            onClick={() => openLogoViewer(r.logoUrl || "", r.full_name || "PIC")}
                            title="Klik untuk lihat full view"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={r.logoUrl} alt={r.full_name || "PIC"} />
                          </button>
                        ) : (
                          <span className="admin-pic-avatar">
                            <span>{(r.full_name || "P").slice(0, 2).toUpperCase()}</span>
                          </span>
                        )}
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
                <div className="admin-field full">
                  <MediaSourceMenu
                    label="Display Picture PIC"
                    mainLabel="Upload Picture"
                    cameraLabel="Ambil dari Kamera"
                    helperText="Format PNG, JPG, JPEG, WEBP, GIF, AVIF, HEIC, atau HEIF. Maksimal 7680 × 7680 px."
                    onMainClick={() => openLogoPicker("gallery")}
                    onCameraClick={() => openLogoPicker("camera")}
                  />
                  <input
                    ref={cameraInputRef}
                    className="visually-hidden-file"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      setPreviewFromFile(e.target.files?.[0] || null);
                      e.currentTarget.value = "";
                    }}
                  />
                  <input
                    ref={galleryInputRef}
                    className="visually-hidden-file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      setPreviewFromFile(e.target.files?.[0] || null);
                      e.currentTarget.value = "";
                    }}
                  />
                  <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 8 }}>
                    <button
                      type="button"
                      className="admin-pic-logo-preview"
                      onClick={() => {
                        if (logoPreview) openLogoViewer(logoPreview, editing ? "Preview Display Picture" : "Preview Display Picture");
                      }}
                      disabled={!logoPreview}
                    >
                      {logoPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoPreview} alt="Preview display picture" />
                      ) : (
                        <span className="muted">Logo</span>
                      )}
                    </button>
                    <div style={{ minWidth: 0 }}>
                      <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                        Klik preview untuk full view.
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {logoFile?.name || (editing?.logoPath ? "Display picture tersimpan" : "Belum ada file dipilih")}
                      </div>
                    </div>
                  </div>
                </div>
                {!editing && (
                  <>
                    <div className="admin-field full">
                      <label>Email PIC</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama-pic@sigap.com"
                      />
                    </div>
                    <div className="admin-field full">
                      <label>Peran</label>
                      <select value={role} onChange={(e) => setRole(e.target.value)}>
                        <option value="field_staff">PIC Lapangan</option>
                        <option value="EHS_officer">EHS Officer</option>
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
        message={`PIC ${deleteTarget?.full_name || "-"} akan dihapus permanen dari storage. Tindakan ini tidak dapat dibatalkan.Masukkan PIN admin untuk melanjutkan.`}
        confirmLabel="Hapus PIC"
        busy={busy}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirmed}
      />

      <ImageLightbox
        open={Boolean(logoViewer)}
        src={logoViewer?.src || ""}
        alt={logoViewer?.title || "Preview display picture"}
        title={logoViewer?.title || "Preview display picture"}
        subtitle="Display picture PIC"
        onClose={() => setLogoViewer(null)}
      />
    </>
  );
}
