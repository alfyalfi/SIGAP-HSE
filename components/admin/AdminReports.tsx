"use client";

import { useMemo, useState } from "react";
import { formatDate, formatDateTime } from "@/lib/constants";
import type { Finding, MonthlyReport } from "@/lib/queries";
import type { AdminDataProps } from "./AdminDashboard";
import {
  buildCsv,
  buildDocxBlob,
  downloadBlobFile,
  downloadTextFile,
  slugifyFileName,
  xmlEscape,
} from "@/lib/export-utils";
import { createClient } from "@/lib/supabase/client";
import {
  buildExportContext,
  buildFindingExportRows,
  buildExportSummary,
  filterFindingsForExport,
  getFindingExportCsvMatrix,
  getFindingExportHeaders,
  buildProfessionalXlsxBlob,
  type ExportFilters,
  type ExportContext,
} from "@/lib/report-export";

type ExportLog = {
  id: string;
  time: string;
  type: string;
  status: string;
};

type AdminReportsProps = AdminDataProps & {
  reports: MonthlyReport[];
};

type ExportFormat = "csv" | "xlsx" | "docx" | "pdf" | "jpg";

const DEFAULT_EXPORT_FILTERS: ExportFilters = {
  status: "",
  area: "",
  category: "",
  company: "",
  dateFrom: "",
  dateTo: "",
};

const EXPORT_FORMATS: Array<{
  id: ExportFormat;
  name: string;
  desc: string;
  tone: string;
}> = [
  { id: "xlsx", name: "Excel XLSX", desc: "Spreadsheet resmi dengan tabel rapi.", tone: "success" },
  { id: "docx", name: "Word DOCX", desc: "Dokumen naratif dengan tabel ringkas.", tone: "blue" },
  { id: "pdf", name: "PDF", desc: "Tampilan cetak siap arsip.", tone: "warning" },
  { id: "jpg", name: "JPG", desc: "Snapshot visual untuk presentasi cepat.", tone: "danger" },
  { id: "csv", name: "CSV", desc: "Format ringan untuk integrasi data.", tone: "neutral" },
];

function escapeHtml(value: string) {
  return xmlEscape(value);
}

function buildMonthlyPreview(findings: Finding[]) {
  const now = new Date();
  const monthLabel = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const monthFindings = findings.filter((f) => {
    const d = new Date(f.foundDatetime || f.foundAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const open = monthFindings.filter((f) => f.status === "open").length;
  const progress = monthFindings.filter((f) => f.status === "progress").length;
  const closed = monthFindings.filter((f) => f.status === "closed").length;
  const rejected = monthFindings.filter((f) => f.status === "rejected").length;
  return { monthLabel, total: monthFindings.length, open, progress, closed, rejected };
}

function openPrintablePdf(title: string, bodyHtml: string) {
  const win = window.open("", "_blank", "width=1200,height=900");
  if (!win) return false;

  win.document.open();
  win.document.write(`<!doctype html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page { margin: 14mm; }
          :root { color-scheme: light; }
          body { font-family: Arial, sans-serif; color: #111827; margin: 0; padding: 24px; }
          h1 { font-size: 24px; margin: 0 0 8px; }
          h2 { font-size: 16px; margin: 18px 0 10px; }
          p { margin: 0 0 8px; line-height: 1.5; }
          .muted { color: #6b7280; font-size: 12px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0 20px; }
          .box { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; background: #f9fafb; }
          .box span { display: block; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: .08em; }
          .box strong { display: block; font-size: 22px; margin-top: 6px; }
          .chart { display: grid; gap: 8px; margin-top: 10px; }
          .bar-row { display: grid; grid-template-columns: 1fr 7fr auto; gap: 8px; align-items: center; font-size: 12px; }
          .bar-track { height: 10px; background: #e5e7eb; border-radius: 999px; overflow: hidden; }
          .bar-fill { height: 100%; background: linear-gradient(90deg, #ff8a3d, #fbbf24); }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; font-size: 12px; vertical-align: top; }
          th { background: #f3f4f6; }
          .section { margin-top: 18px; }
          .badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 999px; background: #f3f4f6; font-size: 11px; }
        </style>
      </head>
      <body>${bodyHtml}</body>
    </html>`);
  win.document.close();

  setTimeout(() => {
    win.focus();
    win.print();
    win.onafterprint = () => win.close();
  }, 250);

  return true;
}

async function exportSummaryJpg(title: string, context: ExportContext) {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1200;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia.");
  const canvasCtx = ctx;

  ctx.fillStyle = "#f4f5f9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  function roundedRect(x: number, y: number, width: number, height: number, radius: number) {
    const r = Math.min(radius, width / 2, height / 2);
    canvasCtx.beginPath();
    canvasCtx.moveTo(x + r, y);
    canvasCtx.arcTo(x + width, y, x + width, y + height, r);
    canvasCtx.arcTo(x + width, y + height, x, y + height, r);
    canvasCtx.arcTo(x, y + height, x, y, r);
    canvasCtx.arcTo(x, y, x + width, y, r);
    canvasCtx.closePath();
  }

  const gradient = canvasCtx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, "#1f2937");
  gradient.addColorStop(1, "#ff8a3d");
  canvasCtx.fillStyle = gradient;
  canvasCtx.fillRect(0, 0, canvas.width, 144);

  canvasCtx.fillStyle = "#fff";
  canvasCtx.font = "700 42px Arial";
  canvasCtx.fillText(title, 56, 70);
  canvasCtx.font = "400 18px Arial";
  canvasCtx.fillText(`Diekspor: ${formatDateTime(new Date().toISOString())}`, 56, 104);

  const cards = [
    ["Total", String(context.summary.total)],
    ["Open", String(context.summary.open)],
    ["Progress", String(context.summary.progress)],
    ["Closed", `${context.summary.closed} (${context.summary.closedRate}%)`],
  ];

  cards.forEach((card, idx) => {
    const x = 56 + idx * 370;
    const y = 184;
    canvasCtx.fillStyle = "#ffffff";
    canvasCtx.strokeStyle = "#e5e7eb";
    canvasCtx.lineWidth = 2;
    roundedRect(x, y, 330, 124, 20);
    canvasCtx.fill();
    canvasCtx.stroke();
    canvasCtx.fillStyle = "#6b7280";
    canvasCtx.font = "700 14px Arial";
    canvasCtx.fillText(card[0], x + 22, y + 34);
    canvasCtx.fillStyle = "#111827";
    canvasCtx.font = "700 34px Arial";
    canvasCtx.fillText(card[1], x + 22, y + 80);
  });

  canvasCtx.fillStyle = "#111827";
  canvasCtx.font = "700 28px Arial";
  canvasCtx.fillText("10 Temuan Terbaru", 56, 382);
  canvasCtx.fillStyle = "#6b7280";
  canvasCtx.font = "400 15px Arial";
  canvasCtx.fillText("Ringkasan visual untuk presentasi kerja HSE", 56, 412);

  const headers = ["Kode", "Tanggal", "Area", "Kategori", "PIC", "Status"];
  const startY = 452;
  const rowHeight = 58;
  const colXs = [56, 240, 470, 700, 940, 1250];

  canvasCtx.fillStyle = "#f3f4f6";
  roundedRect(48, startY - 34, 1496, rowHeight * 11 + 18, 18);
  canvasCtx.fill();

  canvasCtx.fillStyle = "#6b7280";
  canvasCtx.font = "700 14px Arial";
  headers.forEach((header, idx) => canvasCtx.fillText(header, colXs[idx], startY));

  const recentRows = context.rows.slice(0, 10).map((row) => [
    row.code,
    row.foundAtText,
    row.area,
    row.category,
    row.pic,
    row.statusLabel,
  ]);

  recentRows.forEach((row, rowIdx) => {
    const y = startY + 44 + rowIdx * rowHeight;
    if (rowIdx % 2 === 0) {
      canvasCtx.fillStyle = "#ffffff";
      canvasCtx.fillRect(56, y - 26, 1470, 46);
    }
    canvasCtx.fillStyle = "#111827";
    canvasCtx.font = "700 14px Arial";
    canvasCtx.fillText(String(row[0]), colXs[0], y);
    canvasCtx.font = "400 14px Arial";
    canvasCtx.fillText(String(row[1]).slice(0, 18), colXs[1], y);
    canvasCtx.fillText(String(row[2]).slice(0, 18), colXs[2], y);
    canvasCtx.fillText(String(row[3]).slice(0, 18), colXs[3], y);
    canvasCtx.fillText(String(row[4]).slice(0, 18), colXs[4], y);
    const badgeX = colXs[5];
    const badge = String(row[5]);
    canvasCtx.fillStyle =
      badge === "closed" ? "#dcfce7" : badge === "progress" ? "#fef3c7" : badge === "rejected" ? "#fee2e2" : "#dbeafe";
    roundedRect(badgeX, y - 18, 120, 28, 999);
    canvasCtx.fill();
    canvasCtx.fillStyle = "#111827";
    canvasCtx.fillText(badge, badgeX + 18, y + 2);
  });

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (!value) reject(new Error("Gagal membuat JPG."));
      else resolve(value);
    }, "image/jpeg", 0.93);
  });
  downloadBlobFile(blob, `${slugifyFileName(title)}-${new Date().toISOString().slice(0, 10)}.jpg`);
}

export function AdminReports({ findings, profiles, reports }: AdminReportsProps) {
  const supabase = createClient();
  const [exportLog, setExportLog] = useState<ExportLog[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xlsx");
  const [exportFilters, setExportFilters] = useState<ExportFilters>(DEFAULT_EXPORT_FILTERS);
  const [exporting, setExporting] = useState(false);

  const monthlyPreview = useMemo(() => buildMonthlyPreview(findings), [findings]);
  const sortedReports = useMemo(
    () =>
      [...reports].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [reports]
  );

  const filteredFindings = useMemo(
    () => filterFindingsForExport(findings, exportFilters),
    [findings, exportFilters]
  );
  const exportRows = useMemo(
    () => buildFindingExportRows(filteredFindings, profiles),
    [filteredFindings, profiles]
  );

  const exportSummary = useMemo(() => buildExportSummary(exportRows), [exportRows]);

  const categoryOptions = useMemo(
    () => [...new Set(findings.map((f) => f.categoryName).filter(Boolean))].sort(),
    [findings]
  );
  const areaOptions = useMemo(
    () => [...new Set(findings.map((f) => f.areaName).filter(Boolean))].sort(),
    [findings]
  );
  const companyOptions = useMemo(
    () => [...new Set(findings.map((f) => f.companyName).filter(Boolean))].sort(),
    [findings]
  );

  function logExport(type: string, status = "Berhasil") {
    setExportLog((prev) => [
      {
        id: String(Date.now() + Math.random()),
        time: formatDateTime(new Date().toISOString()),
        type,
        status,
      },
      ...prev,
    ].slice(0, 10));
  }

  function buildPdfBody(context: ExportContext) {
    const topRows = context.rows.slice(0, 12).map((row) => [
      row.code,
      row.foundAtText,
      row.area,
      row.category,
      row.pic,
      row.statusLabel,
    ]);
    const maxCount = Math.max(1, ...context.categoryBreakdown.map((item) => item.count));

    return `
      <h1>SIGAP HSE - Laporan Export</h1>
      <p class="muted">Format: ${xmlEscape(exportFormat.toUpperCase())} | Filtered rows: ${context.rows.length} | Diekspor: ${escapeHtml(
        formatDateTime(new Date().toISOString())
      )}</p>
      <div class="grid">
        <div class="box"><span>Total</span><strong>${context.summary.total}</strong></div>
        <div class="box"><span>Open</span><strong>${context.summary.open}</strong></div>
        <div class="box"><span>Progress</span><strong>${context.summary.progress}</strong></div>
        <div class="box"><span>Closed</span><strong>${context.summary.closed}</strong></div>
      </div>
      <div class="section">
        <h2>Distribusi Kategori</h2>
        <div class="chart">
          ${context.categoryBreakdown
            .map(
              (item) => `
                <div class="bar-row">
                  <span>${escapeHtml(item.name)}</span>
                  <div class="bar-track"><div class="bar-fill" style="width:${Math.round((item.count / maxCount) * 100)}%"></div></div>
                  <span>${item.count}</span>
                </div>`
            )
            .join("")}
        </div>
      </div>
      <div class="section">
        <h2>12 Data Terbaru</h2>
        <table>
          <thead>
            <tr>
              <th>Kode</th><th>Tanggal</th><th>Area</th><th>Kategori</th><th>PIC</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${topRows
              .map(
                (row) => `<tr>
                  <td>${escapeHtml(String(row[0]))}</td>
                  <td>${escapeHtml(String(row[1]))}</td>
                  <td>${escapeHtml(String(row[2]))}</td>
                  <td>${escapeHtml(String(row[3]))}</td>
                  <td>${escapeHtml(String(row[4]))}</td>
                  <td>${escapeHtml(String(row[5]))}</td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  async function handleExport() {
    setExporting(true);
    try {
      const rows = filteredFindings;
      const title = "SIGAP HSE Laporan";
      const dateStamp = new Date().toISOString().slice(0, 10);
      const baseName = `sigap-laporan-${dateStamp}-${exportFormat}`;
      const exportContext = buildExportContext(rows, profiles, exportFilters, title);
      const headers = getFindingExportHeaders();
      const exportData = getFindingExportCsvMatrix(exportContext.rows);

      if (exportFormat === "csv") {
        downloadTextFile(buildCsv([headers, ...exportData]), `${baseName}.csv`, "text/csv;charset=utf-8");
      } else if (exportFormat === "xlsx") {
        downloadBlobFile(await buildProfessionalXlsxBlob(exportContext), `${baseName}.xlsx`);
      } else if (exportFormat === "docx") {
        const docx = buildDocxBlob(
          title,
          [
            `Filter status: ${exportFilters.status || "semua"}`,
            `Filter area: ${exportFilters.area || "semua"}`,
            `Filter kategori: ${exportFilters.category || "semua"}`,
            `Filter perusahaan: ${exportFilters.company || "semua"}`,
            `Rentang tanggal: ${exportFilters.dateFrom || "-"} s/d ${exportFilters.dateTo || "-"}`,
            `Total data terpilih: ${rows.length}`,
          ],
          headers,
          exportData
        );
        downloadBlobFile(docx, `${baseName}.docx`);
      } else if (exportFormat === "pdf") {
        const opened = openPrintablePdf(title, buildPdfBody(exportContext));
        if (!opened) window.print();
      } else if (exportFormat === "jpg") {
        await exportSummaryJpg(title, exportContext);
      }

      logExport(`${exportFormat.toUpperCase()} export`);
    } catch (error) {
      console.error(error);
      logExport(`${exportFormat.toUpperCase()} export`, "Gagal");
    } finally {
      setExporting(false);
    }
  }

  async function handleDownloadMonthly(report: MonthlyReport) {
    setDownloadingId(report.id);
    try {
      const { data, error } = await supabase.storage.from("monthly-reports").download(report.storagePath);
      if (error || !data) throw error || new Error("Gagal mengunduh file.");
      const safeFileName =
        report.fileName || `${slugifyFileName(report.companyName)}-${slugifyFileName(report.reportDate || report.reportMonth)}.bin`;
      downloadBlobFile(data, safeFileName);
      logExport(`Unduh ${report.fileName || report.companyName}`);
    } catch (err) {
      logExport(`Gagal unduh ${report.fileName || report.companyName}`, "Gagal");
      console.error(err);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="admin-bottom-stack">
      <div className="admin-bottom-grid" style={{ marginTop: 0 }}>
        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <div className="admin-panel-title">Generator Laporan</div>
              <div className="admin-panel-sub">Pilih filter dulu, lalu ekspor ke format yang paling rapi</div>
            </div>
          </div>

          <div className="admin-export-builder">
            <div className="admin-export-grid">
              <label className="admin-field">
                <span>Format ekspor</span>
                <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as ExportFormat)}>
                  {EXPORT_FORMATS.map((format) => (
                    <option key={format.id} value={format.id}>
                      {format.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>Status</span>
                <select
                  value={exportFilters.status}
                  onChange={(e) => setExportFilters((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="">Semua status</option>
                  <option value="open">Open</option>
                  <option value="progress">On Progress</option>
                  <option value="closed">Closed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
              <label className="admin-field">
                <span>Area</span>
                <select
                  value={exportFilters.area}
                  onChange={(e) => setExportFilters((prev) => ({ ...prev, area: e.target.value }))}
                >
                  <option value="">Semua area</option>
                  {areaOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>Kategori</span>
                <select
                  value={exportFilters.category}
                  onChange={(e) => setExportFilters((prev) => ({ ...prev, category: e.target.value }))}
                >
                  <option value="">Semua kategori</option>
                  {categoryOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>Perusahaan</span>
                <select
                  value={exportFilters.company}
                  onChange={(e) => setExportFilters((prev) => ({ ...prev, company: e.target.value }))}
                >
                  <option value="">Semua perusahaan</option>
                  {companyOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>Dari tanggal</span>
                <input
                  type="date"
                  value={exportFilters.dateFrom}
                  onChange={(e) => setExportFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                />
              </label>
              <label className="admin-field">
                <span>Sampai tanggal</span>
                <input
                  type="date"
                  value={exportFilters.dateTo}
                  onChange={(e) => setExportFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                />
              </label>
              <div className="admin-export-summary">
                <strong>{exportRows.length}</strong>
                <span>data siap diekspor</span>
                <small>
                  Open {exportSummary.open} | Progress {exportSummary.progress} | Closed {exportSummary.closed}
                </small>
              </div>
            </div>

            <div className="admin-export-actions">
              {EXPORT_FORMATS.map((format) => (
                <button
                  key={format.id}
                  type="button"
                  className={`admin-export-chip ${format.tone}${exportFormat === format.id ? " active" : ""}`}
                  onClick={() => setExportFormat(format.id)}
                >
                  {format.name}
                </button>
              ))}
              <button
                type="button"
                className="admin-btn admin-btn-primary admin-btn-export"
                onClick={handleExport}
                disabled={exporting || exportRows.length === 0}
              >
                {exporting ? (
                  <>
                    <span className="button-spinner" aria-hidden />
                    Mengekspor...
                  </>
                ) : (
                  "Ekspor Data Terpilih"
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <div className="admin-panel-title">Riwayat Ekspor</div>
              <div className="admin-panel-sub">Log dokumen yang telah diunduh</div>
            </div>
          </div>
          <div className="admin-table-panel" style={{ border: "none", boxShadow: "none" }}>
            <table>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Jenis</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {exportLog.length ? (
                  exportLog.map((row) => (
                    <tr key={row.id} style={{ cursor: "default" }}>
                      <td className="mono">{row.time}</td>
                      <td>{row.type}</td>
                      <td style={{ color: row.status === "Berhasil" ? "var(--accent-green)" : "var(--accent-red)" }}>
                        {row.status}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="admin-empty">
                      Belum ada ekspor pada sesi ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <div className="admin-panel-title">Monthly Report PIC</div>
            <div className="admin-panel-sub">Daftar file laporan bulanan yang diunggah PIC</div>
          </div>
        </div>
        <div className="admin-table-panel" style={{ border: "none", boxShadow: "none" }}>
          <table>
            <thead>
              <tr>
                <th>Perusahaan</th>
                <th>Periode</th>
                <th>File</th>
                <th>Uploaded</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sortedReports.length ? (
                sortedReports.map((report) => (
                  <tr key={report.id} style={{ cursor: "default" }}>
                    <td>{report.companyName}</td>
                    <td>{formatDate(report.reportDate || report.reportMonth)}</td>
                    <td className="mono">{report.fileName || "-"}</td>
                    <td className="mono">{formatDateTime(report.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn admin-btn-sm"
                        disabled={downloadingId === report.id}
                        onClick={() => handleDownloadMonthly(report)}
                      >
                        {downloadingId === report.id ? "Mengunduh..." : "Download"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="admin-empty">
                    Belum ada monthly report yang diunggah PIC.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <div className="admin-panel-title">Pratinjau Export</div>
            <div className="admin-panel-sub">Ringkasan data yang akan keluar dari sistem</div>
          </div>
        </div>
        <div className="admin-report-grid">
          <div className="admin-review-box">
            <div className="eyebrow">Laporan Bulanan</div>
            <p className="muted">Periode aktif: {monthlyPreview.monthLabel}</p>
            <p className="muted">Total: {monthlyPreview.total}</p>
            <p className="muted">Open: {monthlyPreview.open}</p>
            <p className="muted">Progress: {monthlyPreview.progress}</p>
            <p className="muted">Closed: {monthlyPreview.closed}</p>
            <p className="muted">Rejected: {monthlyPreview.rejected}</p>
          </div>
          <div className="admin-danger-zone">
            <div className="eyebrow">Filter Aktif</div>
            <p className="muted">Status: {exportFilters.status || "Semua"}</p>
            <p className="muted">Area: {exportFilters.area || "Semua"}</p>
            <p className="muted">Kategori: {exportFilters.category || "Semua"}</p>
            <p className="muted">Perusahaan: {exportFilters.company || "Semua"}</p>
            <p className="muted">
              Tanggal: {exportFilters.dateFrom || "-"} s/d {exportFilters.dateTo || "-"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
