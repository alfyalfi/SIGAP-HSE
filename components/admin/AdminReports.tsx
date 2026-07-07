"use client";

import { useMemo, useState } from "react";
import { formatDateTime } from "@/lib/constants";
import type { Finding, Profile } from "@/lib/queries";
import type { AdminDataProps } from "./AdminDashboard";

type ExportLog = {
  id: string;
  time: string;
  type: string;
  status: string;
};

type AdminReportsProps = AdminDataProps;

const REPORT_TYPES = [
  {
    id: "excel",
    name: "Data Excel Mentah",
    desc: "Seluruh temuan sesuai filter aktif (.csv).",
  },
  {
    id: "pdf",
    name: "Presentasi PDF",
    desc: "Ringkasan visual siap cetak untuk manajemen.",
  },
  {
    id: "monthly",
    name: "Rekap Bulanan HSE",
    desc: "Ringkasan KPI dan performa bulan berjalan.",
  },
  {
    id: "area",
    name: "Analisis per Area",
    desc: "Perbandingan tingkat risiko antar fasilitas.",
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

function exportFindingsCsv(findings: Finding[], profiles: Profile[]) {
  const profileName = (id: string) => profiles.find((p) => p.id === id)?.full_name || "PIC";
  const header = ["Kode", "Tanggal", "Area", "Kategori", "PIC", "Perusahaan", "Status"];
  const lines = findings.map((f) =>
    [
      f.code,
      f.foundDatetime || f.foundAt,
      f.areaName,
      f.categoryName,
      profileName(f.createdBy),
      f.companyName,
      f.status,
    ].join(",")
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sigap-laporan-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAreaReport(findings: Finding[]) {
  const map = new Map<string, number>();
  findings.forEach((f) => {
    const key = f.areaName || "Lainnya";
    map.set(key, (map.get(key) || 0) + 1);
  });
  const lines = [
    "SIGAP HSE — Analisis per Area",
    "",
    ...[...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([area, count]) => `${area}: ${count} temuan`),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sigap-area-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminReports({ findings, profiles }: AdminReportsProps) {
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [exportLog, setExportLog] = useState<ExportLog[]>([]);

  const monthlyPreview = useMemo(() => buildMonthlyPreview(findings), [findings]);

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
      exportFindingsCsv(findings, profiles);
      logExport("Data Excel Mentah");
    } else if (id === "pdf") {
      window.print();
      logExport("Presentasi PDF");
    } else if (id === "monthly") {
      const { monthLabel, total, open, progress, closed, rejected } = monthlyPreview;
      const text = [
        `Rekap Bulanan HSE — ${monthLabel}`,
        `Total temuan: ${total}`,
        `Open: ${open} | On Progress: ${progress} | Closed: ${closed} | Rejected: ${rejected}`,
      ].join("\n");
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sigap-rekap-${new Date().toISOString().slice(0, 7)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      logExport("Rekap Bulanan HSE");
    } else if (id === "area") {
      exportAreaReport(findings);
      logExport("Analisis per Area");
    }
  }

  return (
    <div className="admin-bottom-grid" style={{ marginTop: 0 }}>
      <div className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <div className="admin-panel-title">Generator Laporan</div>
            <div className="admin-panel-sub">
              Unduh data sesuai format standar pelaporan HSE
            </div>
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
              <div className="rc-desc">
                {r.id === "monthly"
                  ? `Ringkasan KPI ${monthlyPreview.monthLabel}.`
                  : r.desc}
              </div>
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
              Pratinjau Rekap — {monthlyPreview.monthLabel}
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
  );
}
