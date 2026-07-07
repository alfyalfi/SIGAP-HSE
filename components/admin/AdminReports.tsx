"use client";

import { useMemo, useState } from "react";
import { formatDate, formatDateTime } from "@/lib/constants";
import { REPORT_BUCKET, type Finding, type MonthlyReport, type Profile } from "@/lib/queries";
import { createClient } from "@/lib/supabase/client";
import type { AdminDataProps } from "./AdminDashboard";
import { buildCsv, downloadBlobFile, downloadTextFile, slugifyFileName } from "@/lib/export-utils";

type ExportLog = {
  id: string;
  time: string;
  type: string;
  status: string;
};

type AdminReportsProps = AdminDataProps & {
  reports: MonthlyReport[];
};

const REPORT_TYPES = [
  {
    id: "excel",
    name: "Data Excel Mentah",
    desc: "Ekspor data temuan aktif ke CSV yang bisa dibuka di Excel.",
  },
  {
    id: "pdf",
    name: "Presentasi PDF",
    desc: "Membuka tampilan cetak rapi untuk disimpan sebagai PDF.",
  },
  {
    id: "monthly",
    name: "Rekap Bulanan HSE",
    desc: "Ringkasan KPI dan status bulanan dalam format teks.",
  },
  {
    id: "area",
    name: "Analisis per Area",
    desc: "Rekap temuan per area dalam format CSV.",
  },
] as const;

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

function profileName(profiles: Profile[], id: string) {
  return profiles.find((p) => p.id === id)?.full_name || "PIC";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
          @page { margin: 18mm; }
          body { font-family: Arial, sans-serif; color: #111827; margin: 0; padding: 24px; }
          h1 { font-size: 24px; margin: 0 0 8px; }
          h2 { font-size: 16px; margin: 20px 0 10px; }
          p { margin: 0 0 8px; line-height: 1.5; }
          .muted { color: #6b7280; font-size: 12px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0 20px; }
          .box { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; background: #f9fafb; }
          .box span { display: block; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: .08em; }
          .box strong { display: block; font-size: 22px; margin-top: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; font-size: 12px; }
          th { background: #f3f4f6; }
          .section { margin-top: 18px; }
        </style>
      </head>
      <body>${bodyHtml}</body>
    </html>`);
  win.document.close();

  setTimeout(() => {
    win.focus();
    win.print();
    win.onafterprint = () => win.close();
  }, 300);

  return true;
}

function buildAreaReportCsv(findings: Finding[]) {
  const map = new Map<string, number>();
  findings.forEach((f) => {
    const key = f.areaName || "Lainnya";
    map.set(key, (map.get(key) || 0) + 1);
  });
  const rows = [...map.entries()].sort((a, b) => b[1] - a[1]);
  return buildCsv([["Area", "Jumlah Temuan"], ...rows]);
}

export function AdminReports({ findings, profiles, reports }: AdminReportsProps) {
  const supabase = createClient();
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [exportLog, setExportLog] = useState<ExportLog[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const monthlyPreview = useMemo(() => buildMonthlyPreview(findings), [findings]);
  const sortedReports = useMemo(
    () =>
      [...reports].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [reports]
  );

  function logExport(type: string) {
    setExportLog((prev) => [
      {
        id: String(Date.now()),
        time: formatDateTime(new Date().toISOString()),
        type,
        status: "Berhasil",
      },
      ...prev,
    ].slice(0, 10));
  }

  function handleReport(id: string) {
    setPreviewType(id);

    if (id === "excel") {
      const csv = buildCsv([
        ["Kode", "Tanggal", "Area", "Kategori", "PIC", "Perusahaan", "Status"],
        ...findings.map((f) => [
          f.code,
          f.foundDatetime || f.foundAt,
          f.areaName,
          f.categoryName,
          profileName(profiles, f.createdBy),
          f.companyName,
          f.status,
        ]),
      ]);
      downloadTextFile(csv, `sigap-laporan-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8");
      logExport("Data Excel Mentah");
      return;
    }

    if (id === "pdf") {
      const rows = findings.slice(0, 12).map(
        (f) => `<tr>
          <td>${escapeHtml(f.code)}</td>
          <td>${escapeHtml(formatDateTime(f.foundDatetime || f.foundAt))}</td>
          <td>${escapeHtml(f.areaName)}</td>
          <td>${escapeHtml(f.categoryName)}</td>
          <td>${escapeHtml(profileName(profiles, f.createdBy))}</td>
          <td>${escapeHtml(f.status)}</td>
        </tr>`
      );
      const bodyHtml = `
        <h1>SIGAP HSE - Laporan Presentasi</h1>
        <p class="muted">Diekspor: ${escapeHtml(formatDateTime(new Date().toISOString()))}</p>
        <div class="grid">
          <div class="box"><span>Total Temuan</span><strong>${findings.length}</strong></div>
          <div class="box"><span>Closed</span><strong>${findings.filter((f) => f.status === "closed").length}</strong></div>
          <div class="box"><span>Open</span><strong>${findings.filter((f) => f.status === "open").length}</strong></div>
          <div class="box"><span>Progress</span><strong>${findings.filter((f) => f.status === "progress").length}</strong></div>
        </div>
        <div class="section">
          <h2>12 Temuan Terbaru</h2>
          <table>
            <thead>
              <tr>
                <th>Kode</th><th>Tanggal</th><th>Area</th><th>Kategori</th><th>PIC</th><th>Status</th>
              </tr>
            </thead>
            <tbody>${rows.join("")}</tbody>
          </table>
        </div>
      `;
      const opened = openPrintablePdf("SIGAP HSE - Laporan Presentasi", bodyHtml);
      if (!opened) window.print();
      logExport("Presentasi PDF");
      return;
    }

    if (id === "monthly") {
      const text = [
        `SIGAP HSE - Rekap Bulanan ${monthlyPreview.monthLabel}`,
        `Diekspor: ${formatDateTime(new Date().toISOString())}`,
        "",
        `Total temuan: ${monthlyPreview.total}`,
        `Open: ${monthlyPreview.open}`,
        `On Progress: ${monthlyPreview.progress}`,
        `Closed: ${monthlyPreview.closed}`,
        `Rejected: ${monthlyPreview.rejected}`,
      ].join("\n");
      downloadTextFile(text, `sigap-rekap-${new Date().toISOString().slice(0, 7)}.txt`);
      logExport("Rekap Bulanan HSE");
      return;
    }

    if (id === "area") {
      const csv = buildAreaReportCsv(findings);
      downloadTextFile(csv, `sigap-area-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8");
      logExport("Analisis per Area");
    }
  }

  async function handleDownloadMonthly(report: MonthlyReport) {
    setDownloadingId(report.id);
    try {
      const { data, error } = await supabase.storage.from(REPORT_BUCKET).download(report.storagePath);
      if (error || !data) throw error || new Error("Gagal mengunduh file.");
      const safeFileName =
        report.fileName || `${slugifyFileName(report.companyName)}-${slugifyFileName(report.reportDate || report.reportMonth)}.bin`;
      downloadBlobFile(data, safeFileName);
      logExport(`Unduh ${report.fileName || report.companyName}`);
    } catch (err) {
      logExport(`Gagal unduh ${report.fileName || report.companyName}`);
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
              <div className="admin-panel-sub">Unduh data sesuai format standar pelaporan HSE</div>
            </div>
          </div>

          <div className="admin-report-grid">
            {REPORT_TYPES.map((r) => (
              <button
                key={r.id}
                type="button"
                className="admin-report-card"
                onClick={() => handleReport(r.id)}
              >
                <div className="rc-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                </div>
                <div className="rc-name">{r.name}</div>
                <div className="rc-desc">{r.id === "monthly" ? `Ringkasan KPI ${monthlyPreview.monthLabel}.` : r.desc}</div>
              </button>
            ))}
          </div>

          {previewType === "monthly" && (
            <div
              style={{
                marginTop: 20,
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-card)",
                padding: 18,
              }}
            >
              <div className="admin-panel-title" style={{ fontSize: 15, marginBottom: 10 }}>
                Pratinjau Rekap - {monthlyPreview.monthLabel}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>
                <p>Total temuan bulan ini: <strong>{monthlyPreview.total}</strong></p>
                <p>Open (menunggu data after): <strong>{monthlyPreview.open}</strong></p>
                <p>On Progress (menunggu approval): <strong>{monthlyPreview.progress}</strong></p>
                <p>Closed: <strong>{monthlyPreview.closed}</strong></p>
                <p>Rejected: <strong>{monthlyPreview.rejected}</strong></p>
              </div>
            </div>
          )}
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
                      <td style={{ color: "var(--accent-green)" }}>{row.status}</td>
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
    </div>
  );
}
