"use client";

import { useMemo, useState } from "react";
import { STATUS_LABELS, formatDateTime } from "@/lib/constants";
import type { Finding, Profile } from "@/lib/queries";
import type { AdminDataProps } from "./AdminDashboard";
import { AdminStatusBadge } from "./AdminStatusBadge";
import { buildCsv, downloadTextFile } from "@/lib/export-utils";
import {
  buildFindingExportRows,
  getFindingExportCsvMatrix,
  getFindingExportHeaders,
} from "@/lib/report-export";

const PAGE_SIZE = 8;

type AdminFindingsListProps = AdminDataProps & {
  onViewFinding?: (finding: Finding) => void;
};

function profileName(profiles: Profile[], id: string) {
  return profiles.find((p) => p.id === id)?.full_name || "PIC";
}

function exportCsv(rows: Finding[], profiles: Profile[]) {
  const exportRows = buildFindingExportRows(rows, profiles);
  const csv = buildCsv([getFindingExportHeaders(), ...getFindingExportCsvMatrix(exportRows)]);
  downloadTextFile(csv, `sigap-temuan-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8");
}

export function AdminFindingsList({
  findings,
  profiles,
  onViewFinding,
}: AdminFindingsListProps) {
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [company, setCompany] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [page, setPage] = useState(1);

  const areas = useMemo(
    () => [...new Set(findings.map((f) => f.areaName).filter(Boolean))].sort(),
    [findings]
  );
  const categories = useMemo(
    () => [...new Set(findings.map((f) => f.categoryName).filter(Boolean))].sort(),
    [findings]
  );
  const companies = useMemo(
    () => [...new Set(findings.map((f) => f.companyName).filter(Boolean))].sort(),
    [findings]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return findings.filter((f) => {
      if (area && f.areaName !== area) return false;
      if (category && f.categoryName !== category) return false;
      if (status && f.status !== status) return false;
      if (company && f.companyName !== company) return false;
      if (dateFrom && (f.foundDatetime || f.foundAt).slice(0, 10) < dateFrom) return false;
      if (q) {
        const hay = [
          f.code,
          f.areaName,
          f.categoryName,
          f.companyName,
          f.photoDescription,
          profileName(profiles, f.createdBy),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [findings, search, area, category, status, company, dateFrom, profiles]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetFilters() {
    setSearch("");
    setArea("");
    setCategory("");
    setStatus("");
    setCompany("");
    setDateFrom("");
    setPage(1);
  }

  return (
    <>
      <div className="admin-topbar" style={{ marginBottom: 14, marginTop: -8 }}>
        <div className="admin-search" style={{ flex: 1, maxWidth: 320 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            placeholder="Cari ID, lokasi, PIC..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="admin-topbar-actions">
          <button type="button" className="admin-btn admin-btn-sm" onClick={() => exportCsv(filtered, profiles)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
            CSV
          </button>
          <button type="button" className="admin-btn admin-btn-sm" onClick={() => window.print()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9V2h12v7" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <path d="M6 14h12v8H6z" />
            </svg>
            Cetak
          </button>
        </div>
      </div>

      <div className="admin-filter-bar">
        <span className="admin-filter-tag">Filter:</span>
        <select value={area} onChange={(e) => { setArea(e.target.value); setPage(1); }}>
          <option value="">Semua Area</option>
          {areas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select value={company} onChange={(e) => { setCompany(e.target.value); setPage(1); }}>
          <option value="">Semua Perusahaan</option>
          {companies.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          title="Dari tanggal"
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Semua Status</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <span className="admin-filter-count">{filtered.length} temuan</span>
        <button type="button" className="admin-filter-reset" onClick={resetFilters}>
          Reset filter
        </button>
      </div>

      <div className="admin-table-panel">
        <div className="admin-finding-cards">
          {pageRows.length ? (
            pageRows.map((f) => (
              <button
                key={f.id}
                type="button"
                className="admin-finding-card"
                onClick={() => onViewFinding?.(f)}
                title="Buka detail temuan"
              >
                <div className="admin-finding-card-top">
                  <span className="mono admin-id-cell">{f.code}</span>
                  <AdminStatusBadge status={f.status} />
                </div>
                <div className="admin-finding-card-title">{f.title || f.photoDescription || "-"}</div>
                <div className="admin-finding-card-meta">
                  {formatDateTime(f.foundDatetime || f.foundAt)} · {f.areaName}
                </div>
                <div className="admin-finding-card-meta">{profileName(profiles, f.createdBy)}</div>
                <div className="admin-finding-card-meta">Buka detail untuk riwayat dan tindakan.</div>
              </button>
            ))
          ) : (
            <div className="admin-empty">Tidak ada temuan yang sesuai filter.</div>
          )}
        </div>
        <table className="admin-desktop-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tanggal</th>
              <th>Lokasi</th>
              <th>Kategori</th>
              <th>Deskripsi</th>
              <th>PIC</th>
              <th>Foto</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length ? (
              pageRows.map((f) => {
                const before = f.photos.filter((p) => p.stage === "before").length;
                const after = f.photos.filter((p) => p.stage === "after").length;
                return (
                  <tr key={f.id} onClick={() => onViewFinding?.(f)}>
                    <td className="admin-id-cell">{f.code}</td>
                    <td>{formatDateTime(f.foundDatetime || f.foundAt)}</td>
                    <td>{f.areaName}</td>
                    <td>{f.categoryName}</td>
                    <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.photoDescription || "-"}
                    </td>
                    <td>{profileName(profiles, f.createdBy)}</td>
                    <td>
                      <div className="admin-photo-chip">
                        <span title="Before">{before || "-"}</span>
                        <span title="After">{after || "-"}</span>
                      </div>
                    </td>
                    <td>
                      <AdminStatusBadge status={f.status} />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="admin-empty">
                  Tidak ada temuan yang sesuai filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="admin-table-foot">
          <span>
            Menampilkan {pageRows.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-
            {(currentPage - 1) * PAGE_SIZE + pageRows.length} dari {filtered.length} temuan
          </span>
          <div className="admin-pagination">
            <button
              type="button"
              className="admin-page-btn"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, idx, arr) => (
                <span key={p} style={{ display: "contents" }}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span style={{ padding: "0 4px", color: "var(--text-faint)" }}>…</span>
                  )}
                  <button
                    type="button"
                    className={`admin-page-btn${p === currentPage ? " active" : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button
              type="button"
              className="admin-page-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
