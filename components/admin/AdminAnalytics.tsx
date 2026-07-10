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
import type { Finding, Profile } from "@/lib/queries";
import type { AdminDataProps } from "./AdminDashboard";
import { MobileRecordCard } from "../MobileRecordCard";
import { displayErrorMessage } from "@/lib/errors";
import {
  buildCsv,
  buildDocxBlob,
  downloadBlobFile,
  downloadTextFile,
} from "@/lib/export-utils";
import {
  buildExportContext,
  buildFindingExportRows,
  buildProfessionalJpgBlob,
  buildProfessionalXlsxBlob,
  filterFindingsForExport,
  getFindingExportCsvMatrix,
  getFindingExportHeaders,
  type ExportFilters,
} from "@/lib/report-export";
import { getStatusColor } from "@/lib/constants";

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

type TimeMetric = "new" | "closed" | "open" | "progress" | "rejected";
type ChartMetric = "total" | "open" | "progress" | "closed" | "rejected";
type ExportFormat = "xlsx" | "docx" | "pdf" | "jpg" | "csv";
const TIME_METRIC_OPTIONS: Array<{ value: TimeMetric; label: string }> = [
  { value: "new", label: "Temuan Baru" },
  { value: "open", label: "Open" },
  { value: "progress", label: "On Progress" },
  { value: "closed", label: "Closed" },
  { value: "rejected", label: "Rejected" },
];

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

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function periodLabels(mode: "monthly" | "weekly") {
  const now = new Date();
  if (mode === "weekly") {
    return Array.from({ length: 4 }, (_, i) => `M${i + 1}`);
  }
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
  });
}

function getMetricValue(finding: Finding, metric: ChartMetric | TimeMetric) {
  if (metric === "new") return 1;
  return finding.status === metric ? 1 : 0;
}

function getTimeMetricLabel(metric: TimeMetric) {
  return TIME_METRIC_OPTIONS.find((option) => option.value === metric)?.label ?? metric;
}

function getTrendMetricColor(metric: TimeMetric, index: number) {
  if (metric === "open") return getStatusColor("open");
  if (metric === "closed") return getStatusColor("closed");
  if (metric === "progress") return getStatusColor("progress");
  if (metric === "rejected") return getStatusColor("rejected");
  return CHART_COLORS[index % CHART_COLORS.length];
}

function formatShare(value: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function buildSeries(findings: Finding[], mode: "monthly" | "weekly", metric: TimeMetric) {
  const now = new Date();
  const labels = periodLabels(mode);

  return labels.map((_, idx) => {
    const start =
      mode === "weekly"
        ? new Date(now.getFullYear(), now.getMonth(), 1 + idx * 7)
        : new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
    const end =
      mode === "weekly"
        ? new Date(now.getFullYear(), now.getMonth(), 1 + (idx + 1) * 7 - 1, 23, 59, 59)
        : new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);

    return findings.filter((finding) => {
      const foundAt = parseDate(finding.foundDatetime || finding.foundAt);
      const resolvedAt = parseDate(finding.resolvedDatetime);
      if (metric === "new") return !!foundAt && foundAt >= start && foundAt <= end;
      if (metric === "closed") return !!resolvedAt && resolvedAt >= start && resolvedAt <= end;
      if (finding.status !== metric) return false;
      const ref = parseDate(finding.foundDatetime || finding.foundAt);
      return !!ref && ref >= start && ref <= end;
    }).length;
  });
}

function buildMetricSeries(
  findings: Finding[],
  mode: "monthly" | "weekly",
  metrics: TimeMetric[]
) {
  return metrics.map((metric) => ({
    metric,
    data: buildSeries(findings, mode, metric),
  }));
}

function buildChartBreakdown(findings: Finding[], selector: ChartMetric, field: "category" | "area") {
  const map = new Map<string, number>();
  findings.forEach((finding) => {
    const label = field === "category" ? finding.categoryName : finding.areaName;
    const count = selector === "total" ? 1 : getMetricValue(finding, selector);
    if (!count) return;
    map.set(label, (map.get(label) || 0) + count);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
}

function buildPicStats(findings: Finding[], profiles: Profile[], selector: ChartMetric): PicStats[] {
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

  findings.forEach((finding) => {
    let entry = map.get(finding.createdBy);
    if (!entry) {
      entry = {
        id: finding.createdBy,
        name: finding.companyName || "PIC",
        total: 0,
        open: 0,
        progress: 0,
        closed: 0,
        rate: 0,
      };
      map.set(finding.createdBy, entry);
    }
    const shouldCount = selector === "total" || finding.status === selector;
    if (!shouldCount) return;
    entry.total += 1;
    if (finding.status === "open") entry.open += 1;
    if (finding.status === "progress") entry.progress += 1;
    if (finding.status === "closed") entry.closed += 1;
  });

  return [...map.values()]
    .map((item) => ({
      ...item,
      rate: item.total ? Math.round((item.closed / item.total) * 100) : 0,
    }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);
}

function openPrintablePdf(title: string, subtitle: string, bodyRows: string[]) {
  const win = window.open("", "_blank", "width=1280,height=900");
  if (!win) return false;

  win.document.open();
  win.document.write(`<!doctype html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 28px; color: #111827; }
          h1 { margin: 0 0 8px; font-size: 24px; }
          p { margin: 0 0 10px; color: #6b7280; }
          .card { border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; margin: 14px 0; }
          .row { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
          .row:last-child { border-bottom: none; }
          .label { font-weight: 700; }
          .muted { color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>${subtitle}</p>
        <div class="card">
          ${bodyRows.map((row) => `<div class="row">${row}</div>`).join("")}
        </div>
      </body>
    </html>`);
  win.document.close();
  setTimeout(() => {
    win.focus();
    win.print();
    win.onafterprint = () => win.close();
  }, 200);
  return true;
}

export function AdminAnalytics({ findings, profiles }: AdminAnalyticsProps) {
  const [trendMode, setTrendMode] = useState<"monthly" | "weekly">("monthly");
  const [presentation, setPresentation] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xlsx");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [trendMetrics, setTrendMetrics] = useState<TimeMetric[]>(["new", "open", "closed"]);
  const [categoryMetric, setCategoryMetric] = useState<ChartMetric>("total");
  const [areaMetric, setAreaMetric] = useState<ChartMetric>("total");
  const [picMetric, setPicMetric] = useState<ChartMetric>("total");

  const presentationRef = useRef<HTMLDivElement>(null);
  const trendRef = useRef<HTMLCanvasElement>(null);
  const catRef = useRef<HTMLCanvasElement>(null);
  const areaRef = useRef<HTMLCanvasElement>(null);
  const charts = useRef<Chart[]>([]);

  const dateFilters = useMemo(
    () => ({ status: "", area: "", category: "", company: "", dateFrom, dateTo }),
    [dateFrom, dateTo]
  );
  const filteredFindings = useMemo(
    () => filterFindingsForExport(findings, dateFilters as ExportFilters),
    [findings, dateFilters]
  );
  const exportRows = useMemo(
    () => buildFindingExportRows(filteredFindings, profiles),
    [filteredFindings, profiles]
  );
  const exportContext = useMemo(
    () => buildExportContext(filteredFindings, profiles, dateFilters as ExportFilters, "SIGAP EHS Analisis"),
    [filteredFindings, profiles, dateFilters]
  );

  const summary = useMemo(() => {
    const total = filteredFindings.length;
    const closed = filteredFindings.filter((f) => f.status === "closed").length;
    const open = filteredFindings.filter((f) => f.status === "open").length;
    const rate = total ? Math.round((closed / total) * 100) : 0;
    const avgDays =
      closed > 0
        ? Math.round(
            filteredFindings
              .filter((f) => f.status === "closed" && f.resolvedDatetime)
              .reduce((sum, f) => {
                const start = parseDate(f.foundDatetime || f.foundAt)?.getTime() || 0;
                const end = parseDate(f.resolvedDatetime)?.getTime() || 0;
                return sum + (end - start) / 86400000;
              }, 0) / closed
          )
        : 0;
    return { total, closed, open, rate, avgDays };
  }, [filteredFindings]);

  const categoryBreakdown = useMemo(
    () => buildChartBreakdown(filteredFindings, categoryMetric, "category"),
    [filteredFindings, categoryMetric]
  );
  const areaBreakdown = useMemo(
    () => buildChartBreakdown(filteredFindings, areaMetric, "area"),
    [filteredFindings, areaMetric]
  );
  const picStats = useMemo(
    () => buildPicStats(filteredFindings, profiles, picMetric),
    [filteredFindings, profiles, picMetric]
  );
  const trendSeries = useMemo(
    () => buildMetricSeries(filteredFindings, trendMode, trendMetrics),
    [filteredFindings, trendMode, trendMetrics]
  );
  const trendLabels = useMemo(() => periodLabels(trendMode), [trendMode]);
  const trendSubtitle = useMemo(
    () => `Perbandingan ${trendMetrics.map(getTimeMetricLabel).join(" vs ")}`,
    [trendMetrics]
  );
  const exportReady = Boolean(dateFrom && dateTo);

  function toggleTrendMetric(metric: TimeMetric) {
    setTrendMetrics((current) => {
      if (current.includes(metric)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== metric);
      }
      if (current.length >= 3) return current;
      return [...current, metric];
    });
  }

  useEffect(() => {
    charts.current.forEach((chart) => chart.destroy());
    charts.current = [];

    if (trendRef.current) {
      charts.current.push(
        new Chart(trendRef.current, {
          type: "line",
          data: {
            labels: trendLabels,
            datasets: trendSeries.map((series, index) => {
              const color = getTrendMetricColor(series.metric, index);
              return {
                label: getTimeMetricLabel(series.metric),
                data: series.data,
                borderColor: color,
                backgroundColor: `${color}22`,
                tension: 0.35,
                fill: true,
              };
            }),
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "bottom" },
              tooltip: {
                callbacks: {
                  label(context) {
                    return `${context.dataset.label}: ${context.raw}`;
                  },
                },
              },
            },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
          },
        })
      );
    }

    if (catRef.current) {
      charts.current.push(
        new Chart(catRef.current, {
          type: "doughnut",
          data: {
            labels: categoryBreakdown.map(([name]) => name),
            datasets: [
              {
                data: categoryBreakdown.map(([, value]) => value),
                backgroundColor: CHART_COLORS,
                borderWidth: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "60%",
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label(context) {
                    const count = Number(context.raw || 0);
                    const total = categoryBreakdown.reduce((sum, [, value]) => sum + value, 0);
                    return `${context.label}: ${count} (${formatShare(count, total)})`;
                  },
                },
              },
            },
          },
        })
      );
    }

    if (areaRef.current) {
      charts.current.push(
        new Chart(areaRef.current, {
          type: "bar",
          data: {
            labels: areaBreakdown.map(([name]) => name),
            datasets: [
              {
                label: "Jumlah",
                data: areaBreakdown.map(([, value]) => value),
                backgroundColor: "rgba(59, 130, 246, 0.8)",
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

    return () => charts.current.forEach((chart) => chart.destroy());
  }, [areaBreakdown, categoryBreakdown, trendLabels, trendSeries]);

  async function handleExport() {
    try {
      const baseName = `sigap-analisis-${new Date().toISOString().slice(0, 10)}-${exportFormat}`;
      const headers = getFindingExportHeaders();
      const matrix = getFindingExportCsvMatrix(exportRows);

      if (exportFormat === "csv") {
        downloadTextFile(buildCsv([headers, ...matrix]), `${baseName}.csv`, "text/csv;charset=utf-8");
      } else if (exportFormat === "xlsx") {
        downloadBlobFile(await buildProfessionalXlsxBlob(exportContext), `${baseName}.xlsx`);
      } else if (exportFormat === "docx") {
        const docx = buildDocxBlob(
          "SIGAP EHS Analisis",
          [
            `Rentang tanggal: ${dateFrom || "-"} s/d ${dateTo || "-"}`,
            `Tren aktif: ${trendMetrics.map(getTimeMetricLabel).join(", ")}`,
            `Kategori: ${categoryMetric}`,
            `Area: ${areaMetric}`,
            `PIC: ${picMetric}`,
          ],
          headers,
          matrix
        );
        downloadBlobFile(docx, `${baseName}.docx`);
      } else if (exportFormat === "pdf") {
        const opened = openPrintablePdf(
          "SIGAP EHS Analisis",
          `Rentang ${dateFrom || "-"} s/d ${dateTo || "-"} | Tren ${trendMetrics
            .map(getTimeMetricLabel)
            .join(" vs ")}`,
          [
            `<span class="label">Total data</span><span>${summary.total}</span>`,
            `<span class="label">Closed rate</span><span>${summary.rate}%</span>`,
            `<span class="label">PIC teratas</span><span>${picStats[0]?.name || "-"}</span>`,
            `<span class="label">Kategori teratas</span><span>${categoryBreakdown[0]?.[0] || "-"}</span>`,
          ]
        );
        if (!opened) {
          console.error(displayErrorMessage(null, "Browser menolak membuka jendela cetak.", "REPORT"));
        }
      } else if (exportFormat === "jpg") {
        downloadBlobFile(await buildProfessionalJpgBlob("SIGAP EHS Analisis", exportContext), `${baseName}.jpg`);
      }
    } catch (error) {
      console.error(displayErrorMessage(error, "Gagal mengekspor analisis", "REPORT"));
    }
  }

  async function togglePresentation() {
    const el = presentationRef.current;
    if (!el) {
      setPresentation((prev) => !prev);
      return;
    }

    if (!document.fullscreenElement) {
      try {
        await el.requestFullscreen();
      } catch {
        // ignored, layout still switches
      }
    } else {
      await document.exitFullscreen().catch(() => undefined);
    }
    setPresentation((prev) => !prev);
  }

  useEffect(() => {
    const onFullscreenChange = () => setPresentation(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const content = (
    <>
      <div className="admin-stat-strip">
        <div className="admin-stat-box">
          <div className="admin-stat-label">Total Temuan</div>
          <div className="admin-stat-val">{summary.total}</div>
          <div className="admin-stat-sub">Periode terfilter</div>
        </div>
        <div className="admin-stat-box">
          <div className="admin-stat-label">Tingkat Penyelesaian</div>
          <div className="admin-stat-val">{summary.rate}%</div>
          <div className="admin-stat-sub">{summary.closed} closed</div>
        </div>
        <div className="admin-stat-box">
          <div className="admin-stat-label">Masih Open</div>
          <div className="admin-stat-val">{summary.open}</div>
          <div className="admin-stat-sub">Perlu follow-up</div>
        </div>
        <div className="admin-stat-box">
          <div className="admin-stat-label">Rata-rata Penyelesaian</div>
          <div className="admin-stat-val">{summary.avgDays}</div>
          <div className="admin-stat-sub">hari</div>
        </div>
      </div>

      <div className="admin-panel admin-analysis-controls">
        <div className="admin-export-grid">
          <label className="admin-field">
            <span>Dari tanggal</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label className="admin-field">
            <span>Sampai tanggal</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
          <label className="admin-field">
            <span>Variabel Grafik</span>
            <div className="admin-series-selector" role="group" aria-label="Variabel grafik analisis">
              {TIME_METRIC_OPTIONS.map((option) => {
                const active = trendMetrics.includes(option.value);
                const disabled = !active && trendMetrics.length >= 3;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`admin-series-chip${active ? " active" : ""}`}
                    onClick={() => toggleTrendMetric(option.value)}
                    disabled={disabled}
                    aria-pressed={active}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <span className="admin-field-hint">
              Pilih maksimal 3 variabel. Klik lagi untuk melepas pilihan.
            </span>
          </label>
          <label className="admin-field">
            <span>Kategori</span>
            <select value={categoryMetric} onChange={(e) => setCategoryMetric(e.target.value as ChartMetric)}>
              <option value="total">Total</option>
              <option value="open">Open</option>
              <option value="progress">Progress</option>
              <option value="closed">Closed</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="admin-field">
            <span>Area</span>
            <select value={areaMetric} onChange={(e) => setAreaMetric(e.target.value as ChartMetric)}>
              <option value="total">Total</option>
              <option value="open">Open</option>
              <option value="progress">Progress</option>
              <option value="closed">Closed</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="admin-field">
            <span>PIC</span>
            <select value={picMetric} onChange={(e) => setPicMetric(e.target.value as ChartMetric)}>
              <option value="total">Total</option>
              <option value="open">Open</option>
              <option value="progress">Progress</option>
              <option value="closed">Closed</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="admin-field">
            <span>Format export</span>
            <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as ExportFormat)}>
              <option value="xlsx">Excel XLSX</option>
              <option value="docx">Word DOCX</option>
              <option value="pdf">PDF</option>
              <option value="jpg">JPG</option>
              <option value="csv">CSV</option>
            </select>
          </label>
        </div>

        <div className="admin-topbar" style={{ marginTop: 0, marginBottom: 0 }}>
          <div className="admin-topbar-actions">
            <button type="button" className="admin-btn" onClick={togglePresentation}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
              {presentation ? "Keluar Presentasi" : "Mode Presentasi"}
            </button>
            <button type="button" className="admin-btn admin-btn-primary" onClick={handleExport} disabled={!exportReady}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
              Ekspor
            </button>
          </div>
        </div>
        {!exportReady && (
          <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>
            Pilih rentang tanggal dulu agar export analisis tetap presisi.
          </p>
        )}
      </div>

      <div className="admin-charts-row">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <div className="admin-panel-title">Tren Kinerja</div>
              <div className="admin-panel-sub">{trendSubtitle}</div>
            </div>
            <div className="admin-seg">
              <button type="button" className={trendMode === "monthly" ? "active" : ""} onClick={() => setTrendMode("monthly")}>
                Bulanan
              </button>
              <button type="button" className={trendMode === "weekly" ? "active" : ""} onClick={() => setTrendMode("weekly")}>
                Mingguan
              </button>
            </div>
          </div>
          <div className="admin-chart-wrap" style={{ height: 300 }}>
            <canvas ref={trendRef} />
          </div>
        </div>
        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <div className="admin-panel-title">Distribusi Kategori</div>
              <div className="admin-panel-sub">Mode: {categoryMetric}</div>
            </div>
          </div>
          <div className="admin-chart-wrap sm">
            <canvas ref={catRef} />
          </div>
          <div className="admin-legend-list">
            {categoryBreakdown.slice(0, 5).map(([name, count], i) => (
              <div key={name} className="admin-legend-row">
                <span className="admin-legend-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="admin-legend-name">{name}</span>
                <span className="admin-legend-val">{count} ({formatShare(count, filteredFindings.length)})</span>
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
              <div className="admin-panel-sub">Mode: {areaMetric}</div>
            </div>
          </div>
          <div className="admin-chart-wrap">
            <canvas ref={areaRef} />
          </div>
        </div>
        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <div className="admin-panel-title">Kinerja PIC</div>
              <div className="admin-panel-sub">Mode: {picMetric}</div>
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
      <div ref={presentationRef} className="admin-presentation-mode">
        <div className="admin-topbar">
          <div>
            <div className="admin-page-title">SIGAP EHS - Analisis Kinerja</div>
            <div className="admin-page-sub">Mode presentasi untuk review manajemen</div>
          </div>
          <button type="button" className="admin-btn" onClick={togglePresentation}>
            Tutup
          </button>
        </div>
        {content}
      </div>
    );
  }

  return <div ref={presentationRef}>{content}</div>;
}
