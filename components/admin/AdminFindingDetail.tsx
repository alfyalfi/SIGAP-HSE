"use client";

import { useState } from "react";
import { STATUS_DESCRIPTIONS, formatDateTime } from "@/lib/constants";
import type { Finding, Profile } from "@/lib/queries";
import { AdminStatusBadge } from "./AdminStatusBadge";

type AdminFindingDetailProps = {
  finding: Finding | null;
  profiles: Profile[];
  open: boolean;
  onClose: () => void;
  onApprove?: (findingId: string) => void | Promise<void>;
  onReject?: (findingId: string) => void | Promise<void>;
};

function profileName(profiles: Profile[], id: string) {
  return profiles.find((p) => p.id === id)?.full_name || "PIC";
}

function PhotoGrid({ photos, stage, label, accent }: {
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
}: AdminFindingDetailProps) {
  const [busy, setBusy] = useState(false);

  if (!open || !finding) return null;

  const pic = profileName(profiles, finding.createdBy);
  const canReview = finding.status === "progress";

  async function handleApprove() {
    if (!onApprove || busy) return;
    setBusy(true);
    try {
      await onApprove(finding!.id);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!onReject || busy) return;
    setBusy(true);
    try {
      await onReject(finding!.id);
      onClose();
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

            <div className="admin-photo-set-label">Deskripsi Lengkap</div>
            <div className="admin-detail-desc">
              {finding.photoDescription || "Tidak ada deskripsi."}
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
              <div
                style={{
                  marginTop: 20,
                  background: "var(--surface-2)",
                  padding: 16,
                  borderRadius: "var(--radius-control)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="eyebrow">Review Admin</div>
                <p className="muted" style={{ marginBottom: 12 }}>
                  PIC telah mengunggah data after. Setujui untuk menutup temuan atau tolak untuk
                  revisi ulang.
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn-success"
                    disabled={busy}
                    onClick={handleApprove}
                  >
                    Setujui (Closed)
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger"
                    disabled={busy}
                    onClick={handleReject}
                  >
                    Tolak (Rejected)
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="admin-detail-col">
            <div className="admin-panel-title" style={{ fontSize: 15, marginBottom: 16 }}>
              Timeline Tindak Lanjut
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {timeline.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 12, paddingBottom: 16, position: "relative" }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: item.color,
                      flexShrink: 0,
                      marginTop: 4,
                      boxShadow: `0 0 0 3px var(--surface-2)`,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
                      {item.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
