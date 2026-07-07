"use client";

import { useState } from "react";
import { STATUS_DESCRIPTIONS, formatDateTime } from "@/lib/constants";
import type { Finding, Profile } from "@/lib/queries";
import { AdminPinModal } from "./AdminPinModal";
import { AdminStatusBadge } from "./AdminStatusBadge";

type AdminFindingDetailProps = {
  finding: Finding | null;
  profiles: Profile[];
  open: boolean;
  onClose: () => void;
  onApprove?: (findingId: string) => void | Promise<void>;
  onReject?: (findingId: string) => void | Promise<void>;
  onDelete?: (findingId: string, pin: string) => void | Promise<void>;
};

function profileName(profiles: Profile[], id: string) {
  return profiles.find((p) => p.id === id)?.full_name || "PIC";
}

function PhotoGrid({
  photos,
  stage,
  label,
  accent,
}: {
  photos: Finding["photos"];
  stage: string;
  label: string;
  accent: "before" | "after";
}) {
  const items = photos.filter((p) => p.stage === stage);
  return (
    <div className="admin-photo-set">
      <div className="admin-photo-set-label">{label}</div>
      <div className="admin-photo-grid">
        {items.length ? (
          items.map((p) => (
            <div key={p.id} className={`admin-photo-ph ${accent}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.publicUrl} alt={`Foto ${stage}`} />
            </div>
          ))
        ) : (
          <div className="admin-photo-ph empty">Belum ada foto</div>
        )}
      </div>
    </div>
  );
}

export function AdminFindingDetail({
  finding,
  profiles,
  open,
  onClose,
  onApprove,
  onReject,
  onDelete,
}: AdminFindingDetailProps) {
  const [busy, setBusy] = useState(false);
  const [showDeletePin, setShowDeletePin] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  if (!open || !finding) return null;

  const findingId = finding.id;
  const pic = profileName(profiles, finding.createdBy);
  const canReview = finding.status === "progress";

  async function handleApprove() {
    if (!onApprove || busy) return;
    setBusy(true);
    try {
      await onApprove(findingId);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!onReject || busy) return;
    setBusy(true);
    try {
      await onReject(findingId);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteConfirm(pin: string) {
    if (!onDelete || busy) return;
    setBusy(true);
    setDeleteError("");
    try {
      await onDelete(findingId, pin);
      setShowDeletePin(false);
      onClose();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Gagal menghapus data.");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  const timeline = [
    {
      label: "Temuan dilaporkan",
      time: formatDateTime(finding.createdAt),
      color: "var(--accent-blue)",
    },
    ...(finding.status !== "open"
      ? [
          {
            label: STATUS_DESCRIPTIONS.progress,
            time: formatDateTime(finding.resolvedDatetime || finding.createdAt),
            color: "var(--accent-yellow)",
          },
        ]
      : []),
    ...(finding.status === "closed"
      ? [
          {
            label: STATUS_DESCRIPTIONS.closed,
            time: formatDateTime(finding.resolvedDatetime),
            color: "var(--accent-green)",
          },
        ]
      : []),
    ...(finding.status === "rejected"
      ? [
          {
            label: STATUS_DESCRIPTIONS.rejected,
            time: formatDateTime(finding.createdAt),
            color: "var(--accent-red)",
          },
        ]
      : []),
  ];

  return (
    <>
      <div className="admin-overlay" onClick={onClose}>
        <div className="admin-modal wide" onClick={(e) => e.stopPropagation()}>
          <div className="admin-detail-top">
            <div className="admin-modal-head-left">
              <div className="admin-modal-title mono">{finding.code}</div>
              <AdminStatusBadge status={finding.status} />
            </div>
            <button type="button" className="admin-modal-close" onClick={onClose}>
              ×
            </button>
          </div>

          <div className="admin-detail-grid">
            <div className="admin-detail-col">
              <div className="admin-detail-meta">
                <div className="admin-detail-meta-item">
                  <label>Judul Temuan</label>
                  <div>{finding.title}</div>
                </div>
                <div className="admin-detail-meta-item">
                  <label>Tanggal Temuan</label>
                  <div>{formatDateTime(finding.foundDatetime || finding.foundAt)}</div>
                </div>
                <div className="admin-detail-meta-item">
                  <label>Area / Lokasi</label>
                  <div>{finding.areaName}</div>
                </div>
                <div className="admin-detail-meta-item">
                  <label>Kategori Risiko</label>
                  <div>{finding.categoryName}</div>
                </div>
                <div className="admin-detail-meta-item">
                  <label>Perusahaan</label>
                  <div>{finding.companyName}</div>
                </div>
                <div className="admin-detail-meta-item">
                  <label>PIC</label>
                  <div>{pic}</div>
                </div>
                <div className="admin-detail-meta-item">
                  <label>Status</label>
                  <div>{STATUS_DESCRIPTIONS[finding.status] || finding.status}</div>
                </div>
              </div>

              <div className="admin-photo-set-label">Deskripsi Temuan</div>
              <div className="admin-detail-desc">
                {finding.photoDescription || "Tidak ada deskripsi yang dicatat."}
              </div>
              {finding.afterDescription && (
                <>
                  <div className="admin-photo-set-label">Deskripsi Tindak Lanjut</div>
                  <div className="admin-detail-desc">{finding.afterDescription}</div>
                </>
              )}

              <PhotoGrid
                photos={finding.photos}
                stage="before"
                label="Kondisi Sebelum (Unsafe)"
                accent="before"
              />
              <PhotoGrid
                photos={finding.photos}
                stage="after"
                label="Kondisi Sesudah (Safe)"
                accent="after"
              />

              {canReview && (
                <div className="admin-review-box">
                  <div className="eyebrow">Review Status</div>
                  <p className="muted" style={{ marginBottom: 12 }}>
                    Data tindak lanjut sudah tersedia. Tinjau kembali kelengkapan bukti sebelum
                    menetapkan status akhir.
                  </p>
                  <div className="admin-action-row">
                    <button
                      type="button"
                      className="admin-btn admin-btn-success"
                      disabled={busy}
                      onClick={handleApprove}
                    >
                      Setujui dan Tutup
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger"
                      disabled={busy}
                      onClick={handleReject}
                    >
                      Minta Revisi
                    </button>
                  </div>
                </div>
              )}

              {onDelete && (
                <div className="admin-danger-zone">
                  <div className="eyebrow">Penghapusan Permanen</div>
                  <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
                    Gunakan hanya untuk data duplikat atau salah input. Seluruh foto terkait akan
                    terhapus dan aksi ini tidak dapat dibatalkan.
                  </p>
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger"
                    disabled={busy}
                    onClick={() => setShowDeletePin(true)}
                  >
                    Hapus Permanen
                  </button>
                  {deleteError && !showDeletePin && (
                    <p style={{ color: "var(--accent-red)", fontSize: 12, marginTop: 8 }}>
                      {deleteError}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="admin-detail-col admin-detail-col-side">
              <div className="admin-panel-title" style={{ fontSize: 15, marginBottom: 16 }}>
                Timeline Tindak Lanjut
              </div>
              <div className="admin-timeline">
                {timeline.map((item, i) => (
                  <div key={i} className="admin-timeline-item">
                    <div className="admin-timeline-dot" style={{ background: item.color }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                      <div className="mono admin-timeline-time">{item.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AdminPinModal
        open={showDeletePin}
        title="Konfirmasi Hapus"
        message={`Temuan ${finding.code} akan dihapus permanen beserta seluruh foto terkait. Masukkan PIN admin untuk melanjutkan.`}
        confirmLabel="Hapus Permanen"
        busy={busy}
        onClose={() => {
          setShowDeletePin(false);
          setDeleteError("");
        }}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
