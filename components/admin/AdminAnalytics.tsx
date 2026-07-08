"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart,
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { formatDateTime } from "@/lib/constants";
import type { Finding, Profile } from "@/lib/queries";
import type { AdminDataProps } from "./AdminDashboard";
import { MobileRecordCard } from "../MobileRecordCard";

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  BarController,
  BarElement,
  ArcElement,
  DoughnutController,
  Tooltip,
  Legend
);

const CHART_COLORS = ["#FF8A3D", "#3B82F6", "#22C55E", "#EF4444", "#FBBF24", "#8B7CFA"];

type PicStats = {
  id: string;
  name: string;
  total: number;
  open: number;
  progress: number;
  closed: number;
  rate: number;
};

type AdminAnalyticsProps = AdminDataProps;

function buildPicStats(findings: Finding[], profiles: Profile[]): PicStats[] {
  const map = new Map<string, PicStats>();

  profiles.forEach((p) => {
    map.set(p.id, {
      id: p.id,
      name: p.full_name || "PIC",
      total: 0,
      open: 0,
      progress: 0,
      closed: 0,
      rate: 0,
    });
  });

  findings.forEach((f) => {
    let entry = map.get(f.createdBy);
    if (!entry) {
      entry = {
        id: f.createdBy,
        name: f.companyName || "PIC",
        total: 0,
        open: 0,
        progress: 0,
        closed: 0,
        rate: 0,
      };
      map.set(f.createdBy, entry);
    }
    entry.total += 1;
    if (f.status === "open") entry.open += 1;
    if (f.status === "progress") entry.progress += 1;
    if (f.status === "closed") entry.closed += 1;
  });

  return [...map.values()]
    .map((s) => ({
      ...s,
      rate: s.total ? Math.round((s.closed / s.total) * 100) : 0,
    }))
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total);
}

export function AdminAnalytics({ findings, profiles }: AdminAnalyticsProps) {
  const [trendMode, setTrendMode] = useState<"monthly" | "weekly">("monthly");
  const [presentation, setPresentation] = useState(false);
  const [exportOpts, setExportOpts] = useState({
    trend: true,
    category: true,
    area: true,
    pic: true,
  });

  const trendRef = useRef<HTMLCanvasElement>(null);
  const catRef = useRef<HTMLCanvasElement>(null);
  const areaRef = useRef<HTMLCanvasElement>(null);
  const charts = useRef<Chart[]>([]);

  const picStats = useMemo(() => buildPicStats(findings, profiles), [findings, profiles]);

  const summary = useMemo(() => {
    const total = findings.length;
    const closed = findings.filter((f) => f.status === "closed").length;
    const open = findings.filter((f) => f.status === "open").length;
    const rate = total ? Math.round((closed / total) * 100) : 0;
    const avgDays =
      closed > 0
        ? Math.round(
            findings
              .filter((f) => f.status === "closed" && f.resolvedDatetime)
              .reduce((sum, f) => {
                const start = new Date(f.foundDatetime || f.foundAt).getTime();
                const end = new Date(f.resolvedDatetime!).getTime();
                return sum + (end - start) / 86400000;
              }, 0) / closed
          )
        : 0;
    return { total, closed, open, rate, avgDays };
  }, [findings]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    findings.forEach((f) => {
      const key = f.categoryName || "Lainnya";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [findings]);

  const areaBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    findings.forEach((f) => {
      const key = f.areaName || "Lainnya";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [findings]);

  useEffect(() => {
    charts.current.forEach((c) => c.destroy());
    charts.current = [];

    const now = new Date();
    const labels = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return d.toLocaleDateString("id-ID", { month: "short" });
    });
    const newData = labels.map((_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      return findings.filter((f) => {
        const dt = new Date(f.foundDatetime || f.foundAt);
        return dt >= d && dt <= end;
      }).length;
    });
    const closedData = labels.map((_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      return findings.filter((f) => {
        if (f.status !== "closed" || !f.resolvedDatetime) return false;
        const dt = new Date(f.resolvedDatetime);
        return dt >= d && dt <= end;
      }).length;
    });

    if (trendRef.current) {
      charts.current.push(
        new Chart(trendRef.current, {
          type: "bar",
          data: {
            labels: trendMode === "monthly" ? labels : ["W1", "W2", "W3", "W4"],
            datasets: [
              {
                label: "Baru",
                data: trendMode === "monthly" ? newData : newData.slice(-4),
                backgroundColor: "rgba(255, 138, 61, 0.75)",
              },
              {
                label: "Closed",
                data: trendMode === "monthly" ? closedData : closedData.slice(-4),
                backgroundColor: "rgba(34, 197, 94, 0.75)",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "bottom" } },
            scales: { y: { beginAtZero: true } },
          },
        })
      );
    }

    if (catRef.current) {
      charts.current.push(
        new Chart(catRef.current, {
          type: "doughnut",
          data: {
            labels: categoryBreakdown.map(([n]) => n),
            datasets: [
              {
                data: categoryBreakdown.map(([, c]) => c),
                backgroundColor: CHART_COLORS,
                borderWidth: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "60%",
            plugins: { legend: { display: false } },
          },
        })
      );
    }

    if (areaRef.current) {
      charts.current.push(
        new Chart(areaRef.current, {
          type: "bar",
          data: {
            labels: areaBreakdown.map(([n]) => n),
            datasets: [
              {
                label: "Temuan",
                data: areaBreakdown.map(([, c]) => c),
                backgroundColor: "rgba(91, 157, 255, 0.8)",
              },
            ],
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true } },
          },
        })
      );
    }

    return () => charts.current.forEach((c) => c.destroy());
  }, [findings, trendMode, categoryBreakdown, areaBreakdown]);

  function handleExport() {
    const lines = ["SIGAP HSE — Laporan Analitik", `Diekspor: ${formatDateTime(new Date().toISOString())}`, ""];
    if (exportOpts.trend) {
      lines.push("=== Tren ===", `Mode: ${trendMode}`, `Total temuan: ${summary.total}`, "");
    }
    if (exportOpts.category) {
      lines.push("=== Kategori ===", ...categoryBreakdown.map(([n, c]) => `${n}: ${c}`), "");
    }
    if (exportOpts.area) {
      lines.push("=== Area ===", ...areaBreakdown.map(([n, c]) => `${n}: ${c}`), "");
    }
    if (exportOpts.pic) {
      lines.push(
        "=== Kinerja PIC ===",
        ...picStats.map((p) => `${p.name}: ${p.total} ditangani, ${p.rate}% selesai`),
        ""
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sigap-analitik-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const content = (
    <>
      <div className="admin-stat-strip">
        <div className="admin-stat-box">
          <div className="admin-stat-label">Total Temuan</div>
          <div className="admin-stat-val">{summary.total}</div>
          <div className="admin-stat-sub">Periode berjalan</div>
        </div>
        <div className="admin-stat-box">
          <div className="admin-stat-label">Tingkat Penyelesaian</div>
          <div className="admin-stat-val">{summary.rate}%</div>
          <div className="admin-stat-sub">{summary.closed} temuan closed</div>
        </div>
        <div className="admin-stat-box">
          <div className="admin-stat-label">Masih Open</div>
          <div className="admin-stat-val">{summary.open}</div>
          <div className="admin-stat-sub">Perlu tindak lanjut</div>
        </div>
        <div className="admin-stat-box">
          <div className="admin-stat-label">Rata-rata Penyelesaian</div>
          <div className="admin-stat-val">{summary.avgDays}</div>
          <div className="admin-stat-sub">hari (temuan closed)</div>
        </div>
      </div>

      <div className="admin-topbar" style={{ marginBottom: 14 }}>
        <div className="admin-export-options" style={{ marginTop: 0 }}>
          <label className="admin-check-row">
            <input
              type="checkbox"
              checked={exportOpts.trend}
              onChange={(e) => setExportOpts((o) => ({ ...o, trend: e.target.checked }))}
            />
            Sertakan tren
          </label>
          <label className="admin-check-row">
            <input
              type="checkbox"
              checked={exportOpts.category}
              onChange={(e) => setExportOpts((o) => ({ ...o, category: e.target.checked }))}
            />
            Sertakan kategori
          </label>
          <label className="admin-check-row">
            <input
              type="checkbox"
              checked={exportOpts.area}
              onChange={(e) => setExportOpts((o) => ({ ...o, area: e.target.checked }))}
            />
            Sertakan area
          </label>
          <label className="admin-check-row">
            <input
              type="checkbox"
              checked={exportOpts.pic}
              onChange={(e) => setExportOpts((o) => ({ ...o, pic: e.target.checked }))}
            />
            Sertakan kinerja PIC
          </label>
        </div>
        <div className="admin-topbar-actions">
          <button type="button" className="admin-btn" onClick={() => setPresentation((p) => !p)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            {presentation ? "Keluar Presentasi" : "Mode Presentasi"}
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={handleExport}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
            Ekspor
          </button>
        </div>
      </div>

      <div className="admin-charts-row">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <div className="admin-panel-title">Tren Kinerja HSE</div>
              <div className="admin-panel-sub">Rasio temuan baru vs diselesaikan</div>
            </div>
            <div className="admin-seg">
              <button
                type="button"
                className={trendMode === "monthly" ? "active" : ""}
                onClick={() => setTrendMode("monthly")}
              >
                Bulanan
              </button>
              <button
                type="button"
                className={trendMode === "weekly" ? "active" : ""}
                onClick={() => setTrendMode("weekly")}
              >
                Mingguan
              </button>
            </div>
          </div>
          <div className="admin-chart-wrap" style={{ height: 260 }}>
            <canvas ref={trendRef} />
          </div>
        </div>
        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <div className="admin-panel-title">Distribusi Kategori</div>
              <div className="admin-panel-sub">Risiko terbanyak periode ini</div>
            </div>
          </div>
          <div className="admin-chart-wrap sm">
            <canvas ref={catRef} />
          </div>
          <div className="admin-legend-list">
            {categoryBreakdown.slice(0, 5).map(([name, count], i) => (
              <div key={name} className="admin-legend-row">
                <span className="admin-legend-dot" style={{ background: CHART_COLORS[i] }} />
                <span className="admin-legend-name">{name}</span>
                <span className="admin-legend-val">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-charts-row">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <div className="admin-panel-title">Pemetaan Area</div>
              <div className="admin-panel-sub">Volume temuan berdasarkan lokasi fasilitas</div>
            </div>
          </div>
          <div className="admin-chart-wrap">
            <canvas ref={areaRef} />
          </div>
        </div>
        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <div className="admin-panel-title">Kinerja Penanganan PIC</div>
              <div className="admin-panel-sub">Tingkat respons &amp; penyelesaian</div>
            </div>
          </div>
          <div className="admin-table-panel" style={{ border: "none", boxShadow: "none" }}>
            <div className="mobile-only admin-mobile-card-list">
              {picStats.length ? (
                picStats.map((p, i) => (
                <MobileRecordCard
                  key={p.id}
                  title={p.name}
                  badge={<span className={`mobile-record-chip ${i < 3 ? "warning" : "neutral"}`}>#{i + 1}</span>}
                  sections={[
                    {
                      title: "Ringkasan kinerja",
                      fields: [
                        { label: "Ditangani", value: p.total },
                        { label: "Closed", value: p.closed },
                        {
                          label: "Tingkat selesai",
                          value: (
                            <div className="mobile-progress">
                              <div className="mobile-progress-track">
                                <div className="mobile-progress-fill" style={{ width: `${p.rate}%` }} />
                              </div>
                              <span>{p.rate}%</span>
                            </div>
                          ),
                        },
                      ],
                    },
                  ]}
                />
                ))
              ) : (
                <div className="admin-empty">Belum ada data kinerja PIC.</div>
              )}
            </div>
            <div className="desktop-only">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>PIC</th>
                    <th>Ditangani</th>
                    <th>Closed</th>
                    <th>Tingkat Selesai</th>
                  </tr>
                </thead>
                <tbody>
                  {picStats.length ? (
                    picStats.map((p, i) => (
                      <tr key={p.id} style={{ cursor: "default" }}>
                        <td>
                          <span className={`admin-rank-num${i < 3 ? " top" : ""}`}>{i + 1}</span>
                        </td>
                        <td>{p.name}</td>
                        <td>{p.total}</td>
                        <td>{p.closed}</td>
                        <td>
                          <div className="admin-bar-cell">
                            <div className="admin-bar-track">
                              <div className="admin-bar-fill" style={{ width: `${p.rate}%` }} />
                            </div>
                            <span className="mono">{p.rate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="admin-empty">
                        Belum ada data kinerja PIC.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  if (presentation) {
    return (
      <div className="admin-presentation-mode">
        <div className="admin-topbar">
          <div>
            <div className="admin-page-title">SIGAP HSE — Analisis Kinerja</div>
            <div className="admin-page-sub">Mode presentasi untuk review manajemen</div>
          </div>
          <button type="button" className="admin-btn" onClick={() => setPresentation(false)}>
            Tutup
          </button>
        </div>
        {content}
      </div>
    );
  }

  return content;
}
