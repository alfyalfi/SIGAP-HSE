"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "./StatusBadge";
import { MobileRecordCard } from "./MobileRecordCard";
import { createClient } from "@/lib/supabase/client";
import { getFindingById, type Finding } from "@/lib/queries";
import { formatDateTime } from "@/lib/constants";

function KpiRow({
  findings,
  onFilter,
  activeStatus,
}: {
  findings: Finding[];
  onFilter: (status: string) => void;
  activeStatus: string;
}) {
  const cards = [
    { label: "Total", value: findings.length, cls: "" },
    { label: "Open", value: findings.filter((f) => f.status === "open").length, cls: "open" },
    { label: "Progress", value: findings.filter((f) => f.status === "progress").length, cls: "progress" },
    { label: "Closed", value: findings.filter((f) => f.status === "closed").length, cls: "closed" },
    { label: "Rejected", value: findings.filter((f) => f.status === "rejected").length, cls: "rejected" },
  ];
  return (
    <div className="kpi-row">
      {cards.map((c) => (
        <button
          key={c.label}
          type="button"
          className={`kpi-card kpi-${c.cls}${activeStatus === c.cls ? " active" : ""}`}
          onClick={() => onFilter(c.cls)}
          title="Klik untuk memfilter daftar"
        >
          <p>{c.label}</p>
          <strong>{c.value}</strong>
        </button>
      ))}
    </div>
  );
}

export function UserDashboard({ findings }: { findings: Finding[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [statusFilter, setStatusFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailRequestRef = useRef(0);
  const deferredStatusFilter = useDeferredValue(statusFilter);
  const deferredAreaFilter = useDeferredValue(areaFilter);
  const deferredDateFrom = useDeferredValue(dateFrom);

  const areas = useMemo(
    () => [...new Set(findings.map((f) => f.areaName).filter((a) => a && a !== "-"))].sort(),
    [findings]
  );

  const filtered = useMemo(() => {
    return findings.filter((f) => {
      if (deferredStatusFilter && f.status !== deferredStatusFilter) return false;
      if (deferredAreaFilter && f.areaName !== deferredAreaFilter) return false;
      if (deferredDateFrom && (f.foundDatetime || f.foundAt).slice(0, 10) < deferredDateFrom) return false;
      return true;
    });
  }, [findings, deferredStatusFilter, deferredAreaFilter, deferredDateFrom]);

  async function handleRefresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 600);
  }

  function canUpdate(f: Finding) {
    return f.status === "open" || f.status === "rejected";
  }

  function closeDetail() {
    detailRequestRef.current += 1;
    setDetailOpen(false);
    setDetailLoading(false);
  }

  function openFinding(f: Finding) {
    const requestId = ++detailRequestRef.current;
    setSelectedFinding(f);
    setDetailOpen(true);
    setDetailLoading(true);
    void (async () => {
      try {
        const detailed = await getFindingById(supabase, f.id);
        if (requestId === detailRequestRef.current && detailed) {
          setSelectedFinding(detailed);
        }
      } finally {
        if (requestId === detailRequestRef.current) {
          setDetailLoading(false);
        }
      }
    })();
  }

  function handleRowKeyDown(event: ReactKeyboardEvent<HTMLTableRowElement>, finding: Finding) {
    if (event.key !== "Enter" && event.key !== "Space" && event.key !== " ") return;
    event.preventDefault();
    openFinding(finding);
  }

  return (
    <>
      <div className="page-intro dashboard-intro">
        <div>
          <h2>Dashboard Temuan</h2>
          <p className="muted">Ketuk temuan untuk melihat detail dan tindak lanjutnya.</p>
        </div>
        <button
          type="button"
          className="button button-secondary"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? "Memuat..." : "Segarkan"}
        </button>
      </div>

      <KpiRow
        findings={findings}
        onFilter={setStatusFilter}
        activeStatus={statusFilter}
      />

      <div className="card filter-card">
        <div className="filter-row filter-row-primary">
          <label className="filter-grow">
            <span>Status</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Semua</option>
              <option value="open">Open</option>
              <option value="progress">On Progress</option>
              <option value="closed">Closed</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <button
            type="button"
            className="button button-secondary filter-toggle"
            onClick={() => setShowFilters((v) => !v)}
          >
            {showFilters ? "Tutup" : "Filter"}
          </button>
        </div>
        {showFilters && (
          <div className="filter-row filter-row-extra">
            <label>
              <span>Area</span>
              <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
                <option value="">Semua area</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Dari Tanggal</span>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </label>
          </div>
        )}
      </div>

      <div className="finding-cards mobile-only mobile-record-card-list">
        {filtered.length ? (
          filtered.map((f) => (
            <MobileRecordCard
              key={f.id}
              className="finding-card"
              title={f.code}
              subtitle={f.title}
              badge={<StatusBadge status={f.status} />}
              sections={[
                {
                  title: "Informasi utama",
                  fields: [
                    { label: "Tanggal", value: formatDateTime(f.foundDatetime || f.foundAt) },
                    { label: "Area", value: f.areaName },
                    { label: "Kategori", value: f.categoryName },
                  ],
                },
              ]}
              actions={
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => openFinding(f)}
                >
                  Detail
                </button>
              }
            />
          ))
        ) : (
          <p className="muted card" style={{ padding: 20 }}>
            Belum ada temuan.
          </p>
        )}
      </div>

      <div className="card table-card desktop-only">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Judul</th>
                <th>Tanggal</th>
                <th>Area</th>
                <th>Kategori</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((f) => (
                  <tr
                    key={f.id}
                    className="row-clickable"
                    tabIndex={0}
                    role="button"
                    title="Klik untuk melihat detail"
                    onClick={() => openFinding(f)}
                    onKeyDown={(event) => handleRowKeyDown(event, f)}
                  >
                    <td className="mono">{f.code}</td>
                    <td>{f.title}</td>
                    <td>{formatDateTime(f.foundDatetime || f.foundAt)}</td>
                    <td>{f.areaName}</td>
                    <td>{f.categoryName}</td>
                    <td>
                      <StatusBadge status={f.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="muted">
                    Belum ada temuan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detailOpen && selectedFinding && (
        <div className="modal finding-detail-modal" role="dialog" aria-modal="true">
          <div className="modal-backdrop" onClick={closeDetail} />
          <div className="modal-card card modal-wide finding-detail-card" onClick={(e) => e.stopPropagation()}>
            <div className="finding-detail-head">
              <div>
                <div className="eyebrow">Detail Temuan</div>
                <h3 className="section-title mono">{selectedFinding.code}</h3>
              </div>
              <StatusBadge status={selectedFinding.status} />
            </div>

            {detailLoading && <p className="muted">Memuat detail...</p>}

            <div className="finding-detail-grid">
              <div className="finding-detail-meta">
                <div>
                  <span>Judul</span>
                  <strong>{selectedFinding.title}</strong>
                </div>
                <div>
                  <span>Tanggal</span>
                  <strong>{formatDateTime(selectedFinding.foundDatetime || selectedFinding.foundAt)}</strong>
                </div>
                <div>
                  <span>Area</span>
                  <strong>{selectedFinding.areaName}</strong>
                </div>
                <div>
                  <span>Kategori</span>
                  <strong>{selectedFinding.categoryName}</strong>
                </div>
              </div>

              <div className="finding-detail-box">
                <div className="eyebrow">Deskripsi</div>
                <p>{selectedFinding.photoDescription || "-"}</p>
              </div>

              {selectedFinding.status === "rejected" && (
                <div className="finding-detail-warning">
                  <div className="eyebrow">Perlu Revisi</div>
                  <p>
                    Terdapat data yang tidak dapat divalidasi oleh tim admin. Harap lakukan input temuan ulang.
                    Data temuan ini akan otomatis terhapus dalam waktu 1x24 jam.
                  </p>
                  <div className="finding-detail-comment">
                    <span>Komentar admin</span>
                    <strong>{selectedFinding.rejectComment || "Tidak ada komentar."}</strong>
                  </div>
                </div>
              )}

              <div className="finding-detail-box finding-detail-actions">
                <button type="button" className="button button-secondary" onClick={closeDetail}>
                  Tutup
                </button>
                {canUpdate(selectedFinding) && (
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => router.push(`/form-after/${selectedFinding.id}`)}
                  >
                    {selectedFinding.status === "rejected" ? "Proses Revisi" : "Proses After"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
