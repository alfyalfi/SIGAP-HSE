"use client";

import { useEffect, useMemo, useState } from "react";
import type { Finding, Profile } from "@/lib/queries";
import type { AdminDataProps } from "./AdminDashboard";
import { MobileRecordCard } from "../MobileRecordCard";

type PicRow = Profile & {
  total: number;
  open: number;
  progress: number;
  closed: number;
  rate: number;
};

type AdminMasterPicProps = AdminDataProps & {
  onPicAdd?: (payload: { full_name: string; role: string }) => void | Promise<void>;
  onPicEdit?: (id: string, payload: { full_name: string }) => void | Promise<void>;
  onPicDelete?: (id: string) => void | Promise<void>;
};

function buildPicRows(findings: Finding[], profiles: Profile[]): PicRow[] {
  return profiles
    .filter((p) => p.role !== "admin")
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
  const [localProfiles, setLocalProfiles] = useState(profiles);

  useEffect(() => {
    setLocalProfiles(profiles);
  }, [profiles]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const rows = useMemo(() => buildPicRows(findings, localProfiles), [findings, localProfiles]);

  const totals = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.total, 0);
    const closed = rows.reduce((s, r) => s + r.closed, 0);
    const rate = total ? Math.round((closed / total) * 100) : 0;
    return { picCount: rows.length, total, rate };
  }, [rows]);

  function openAdd() {
    setEditing(null);
    setName("");
    setModalOpen(true);
  }

  function openEdit(p: Profile) {
    setEditing(p);
    setName(p.full_name || "");
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    if (editing) {
      await onPicEdit?.(editing.id, { full_name: name.trim() });
      setLocalProfiles((prev) => prev.map((p) => (p.id === editing.id ? { ...p, full_name: name.trim() } : p)));
    } else {
      const newId = `pic-${Date.now()}`;
      const payload = { full_name: name.trim(), role: "field_staff" };
      await onPicAdd?.(payload);
      setLocalProfiles((prev) => [...prev, { id: newId, ...payload }]);
    }
    setModalOpen(false);
  }

  async function handleDelete(id: string) {
    await onPicDelete?.(id);
    setLocalProfiles((prev) => prev.filter((p) => p.id !== id));
    setDeleteConfirm(null);
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
                      onClick={() => setDeleteConfirm(r.id)}
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
                        <span className="admin-avatar">{(r.full_name || "P").slice(0, 2).toUpperCase()}</span>
                        {r.full_name || "—"}
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
                          onClick={() => setDeleteConfirm(r.id)}
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
        <div className="admin-overlay" onClick={() => setModalOpen(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-detail-top">
              <div className="admin-modal-title">{editing ? "Edit PIC" : "Tambah PIC Baru"}</div>
              <button type="button" className="admin-modal-close" onClick={() => setModalOpen(false)}>
                ×
              </button>
            </div>
            <div style={{ padding: 22 }}>
              <div className="admin-field full">
                <label>Nama Lengkap PIC</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama penanggung jawab"
                />
              </div>
            </div>
            <div className="admin-modal-foot">
              <button type="button" className="admin-btn" onClick={() => setModalOpen(false)}>
                Batal
              </button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={handleSave}>
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="admin-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="admin-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-detail-top">
              <div className="admin-modal-title">Hapus PIC?</div>
              <button type="button" className="admin-modal-close" onClick={() => setDeleteConfirm(null)}>
                ×
              </button>
            </div>
            <div style={{ padding: 22, fontSize: 13, color: "var(--text-secondary)" }}>
              PIC yang dihapus tidak akan muncul di daftar master. Temuan yang sudah ada tetap tersimpan.
            </div>
            <div className="admin-modal-foot">
              <button type="button" className="admin-btn" onClick={() => setDeleteConfirm(null)}>
                Batal
              </button>
              <button type="button" className="admin-btn admin-btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
