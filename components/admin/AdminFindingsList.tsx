"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { STATUS_LABELS, formatDateTime } from "@/lib/constants";
import type { Finding, Profile } from "@/lib/queries";
import type { AdminDataProps } from "./AdminDashboard";
import { AdminStatusBadge } from "./AdminStatusBadge";
import { MobileRecordCard } from "../MobileRecordCard";
import { downloadBlobFile, slugifyFileName } from "@/lib/export-utils";
import { buildExportContext, buildProfessionalXlsxBlob } from "@/lib/report-export";

const PAGE_SIZE = 8;

type AdminFindingsListProps = AdminDataProps & {
  onViewFinding?: (finding: Finding) => void;
};

function profileName(profiles: Profile[], id: string) {
  return profiles.find((p) => p.id === id)?.full_name || "PIC";
}

async function exportXlsx(
  rows: Finding[],
  profiles: Profile[],
  filters: { status: string; area: string; category: string; company: string; dateFrom: string; dateTo: string }
) {
  const context = buildExportContext(rows, profiles, filters, "SIGAP HSE Daftar Temuan");
  const blob = await buildProfessionalXlsxBlob(context);
  downloadBlobFile(blob, `${slugifyFileName(`sigap-temuan-${new Date().toISOString().slice(0, 10)}`)}.xlsx`);
}

export function AdminFindingsList({ findings, profiles, onViewFinding }: AdminFindingsListProps) {
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [company, setCompany] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);

  const areas = useMemo(() => [...new Set(findings.map((f) => f.areaName).filter(Boolean))].sort(), [findings]);
  const categories = useMemo(
    () => [...new Set(findings.map((f) => f.categoryName).filter(Boolean))].sort(),
    [findings]
  );
  const companies = useMemo(
    () => [...new Set(findings.map((f) => f.companyName).filter(Boolean))].sort(),
    [findings]
  );

  const filtered = useMemo(() => {
    const q = deferredSearch.toLowerCase();
    return findings.filter((f) => {
      if (area && f.areaName !== area) return false;
      if (category && f.categoryName !== category) return false;
      if (status && f.status !== status) return false;
      if (company && f.companyName !== company) return false;
      if (dateFrom && (f.foundDatetime || f.foundAt).slice(0, 10) < dateFrom) return false;
      if (dateTo && (f.foundDatetime || f.foundAt).slice(0, 10) > dateTo) return false;
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
  }, [findings, deferredSearch, area, category, status, company, dateFrom, dateTo, profiles]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const exportReady = Boolean(dateFrom && dateTo);

  function resetFilters() {
    setSearch("");
    setArea("");
    setCategory("");
    setStatus("");
    setCompany("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function openRowFinding(finding: Finding) {
    onViewFinding?.(finding);
  }

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    finding: Finding
  ) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openRowFinding(finding);
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
          <button
            type="button"
            className="admin-btn admin-btn-sm"
            disabled={!exportReady}
            onClick={async () => exportXlsx(filtered, profiles, { status, area, category, company, dateFrom, dateTo })}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
            Excel
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
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select value={company} onChange={(e) => { setCompany(e.target.value); setPage(1); }}>
          <option value="">Semua Perusahaan</option>
          {companies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          title="Dari tanggal"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          title="Sampai tanggal"
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Semua Status</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
        <span className="admin-filter-count">{filtered.length} temuan</span>
        <button type="button" className="admin-filter-reset" onClick={resetFilters}>
          Reset filter
        </button>
      </div>
      {!exportReady && (
        <p className="muted" style={{ marginBottom: 12, fontSize: 12 }}>
          Pilih rentang tanggal dari dan sampai sebelum ekspor Excel.
        </p>
      )}

      <div className="admin-table-panel">
        <div className="mobile-only admin-mobile-card-list">
          {pageRows.length ? (
            pageRows.map((f) => {
              const before = f.photoCounts?.before ?? f.photos.filter((p) => p.stage === "before").length;
              const after = f.photoCounts?.after ?? f.photos.filter((p) => p.stage === "after").length;
              return (
                <MobileRecordCard
                  key={f.id}
                  title={f.code}
                  subtitle={f.title || f.photoDescription || "-"}
                  badge={<AdminStatusBadge status={f.status} />}
                  sections={[
                    {
                      title: "Informasi utama",
                      fields: [
                        { label: "Tanggal", value: formatDateTime(f.foundDatetime || f.foundAt) },
                        { label: "Lokasi", value: f.areaName },
                        { label: "Kategori", value: f.categoryName },
                      ],
                    },
                  ]}
                  detailsLabel="Lihat detail temuan"
                  detailsSections={[
                    {
                      title: "Detail tambahan",
                      fields: [
                        { label: "Deskripsi", value: f.photoDescription || "-" },
                        { label: "PIC", value: profileName(profiles, f.createdBy) },
                        { label: "Foto", value: `${before || "-"} before / ${after || "-"} after` },
                      ],
                    },
                  ]}
                  actions={
                    <button type="button" className="admin-btn" onClick={() => onViewFinding?.(f)}>
                      Buka detail
                    </button>
                  }
                />
              );
            })
          ) : (
            <div className="admin-empty">Tidak ada temuan yang sesuai filter.</div>
          )}
        </div>

        <div className="desktop-only">
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
                  const before = f.photoCounts?.before ?? f.photos.filter((p) => p.stage === "before").length;
                  const after = f.photoCounts?.after ?? f.photos.filter((p) => p.stage === "after").length;
                  return (
                    <tr
                      key={f.id}
                      className={onViewFinding ? "row-clickable" : undefined}
                      tabIndex={onViewFinding ? 0 : undefined}
                      role={onViewFinding ? "button" : undefined}
                      title={onViewFinding ? "Buka detail temuan" : undefined}
                      onClick={() => openRowFinding(f)}
                      onKeyDown={(event) => handleRowKeyDown(event, f)}
                    >
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
        </div>

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
