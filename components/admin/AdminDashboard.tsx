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
import {
  STATUS_DESCRIPTIONS,
  STATUS_LABELS,
  formatDateTime,
} from "@/lib/constants";
import type { Finding, Profile } from "@/lib/queries";
import { AdminStatusBadge } from "./AdminStatusBadge";
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

export type AdminDataProps = {
  findings: Finding[];
  profiles: Profile[];
  onRefresh?: () => void;
  onApprove?: (findingId: string) => void | Promise<void>;
  onReject?: (findingId: string) => void | Promise<void>;
};

type AdminDashboardProps = AdminDataProps & {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  statusFilter?: string | null;
  onStatusFilter?: (status: string | null) => void;
  onViewFinding?: (finding: Finding) => void;
  onNavigate?: (view: "temuan") => void;
};

function profileName(profiles: Profile[], id: string) {
  return profiles.find((p) => p.id === id)?.full_name || "PIC";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function matchesSearch(f: Finding, q: string, profiles: Profile[]) {
  if (!q.trim()) return true;
  const hay = [
    f.code,
    f.title,
    f.areaName,
    f.categoryName,
    f.companyName,
    f.photoDescription,
    profileName(profiles, f.createdBy),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

function buildMonthlyTrend(findings: Finding[]) {
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" })
    );
  }
  const newCounts = months.map((_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    return findings.filter((f) => {
      const dt = new Date(f.foundDatetime || f.foundAt);
      return dt >= d && dt <= end;
    }).length;
  });
  const closedCounts = months.map((_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    return findings.filter((f) => {
      if (f.status !== "closed" || !f.resolvedDatetime) return false;
      const dt = new Date(f.resolvedDatetime);
      return dt >= d && dt <= end;
    }).length;
  });
  return { labels: months, newCounts, closedCounts };
}

const CHART_COLORS = [
  "#FF8A3D",
  "#3B82F6",
  "#22C55E",
  "#EF4444",
  "#FBBF24",
  "#8B7CFA",
  "#5B9DFF",
];

export function AdminDashboard({
  findings,
  profiles,
  searchQuery: controlledSearch,
  onSearchChange,
  statusFilter: controlledFilter,
  onStatusFilter,
  onViewFinding,
  onNavigate,
}: AdminDashboardProps) {
  const [localSearch, setLocalSearch] = useState("");
  const [localFilter, setLocalFilter] = useState<string | null>(null);
  const [trendMode, setTrendMode] = useState<"monthly" | "weekly">("monthly");
  const [activityTab, setActivityTab] = useState<"pic" | "admin">("pic");

  const searchQuery = controlledSearch ?? localSearch;
  const statusFilter = controlledFilter !== undefined ? controlledFilter : localFilter;

  const trendRef = useRef<HTMLCanvasElement>(null);
  const catRef = useRef<HTMLCanvasElement>(null);
  const trendChart = useRef<Chart | null>(null);
  const catChart = useRef<Chart | null>(null);

  const stats = useMemo(() => {
    const total = findings.length;
    const open = findings.filter((f) => f.status === "open").length;
    const progress = findings.filter((f) => f.status === "progress").length;
    const closed = findings.filter((f) => f.status === "closed").length;
    const rejected = findings.filter((f) => f.status === "rejected").length;
    const closedPct = total ? Math.round((closed / total) * 100) : 0;
    return { total, open, progress, closed, rejected, closedPct };
  }, [findings]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    findings.forEach((f) => {
      const key = f.categoryName || "Lainnya";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [findings]);

  const recentFindings = useMemo(
    () =>
      [...findings]
        .filter((f) => matchesSearch(f, searchQuery, profiles))
        .filter((f) => !statusFilter || f.status === statusFilter)
        .slice(0, 6),
    [findings, searchQuery, profiles, statusFilter]
  );

  const activities = useMemo(() => {
    const items: {
      id: string;
      who: string;
      action: string;
      ref: string;
      time: string;
      color: string;
      type: "pic" | "admin";
    }[] = [];

    findings.forEach((f) => {
      const who = profileName(profiles, f.createdBy);
      items.push({
        id: `${f.id}-created`,
        who,
        action: "melaporkan temuan",
        ref: f.code,
        time: formatDateTime(f.createdAt),
        color: "var(--accent-blue)",
        type: "pic",
      });
      if (f.status === "progress") {
        items.push({
          id: `${f.id}-progress`,
          who,
          action: "mengajukan penyelesaian —",
          ref: STATUS_DESCRIPTIONS.progress,
          time: formatDateTime(f.resolvedDatetime || f.createdAt),
          color: "var(--accent-yellow)",
          type: "pic",
        });
      }
      if (f.status === "closed") {
        items.push({
          id: `${f.id}-closed`,
          who: "Admin HSE",
          action: "menyetujui temuan",
          ref: f.code,
          time: formatDateTime(f.resolvedDatetime || f.createdAt),
          color: "var(--accent-green)",
          type: "admin",
        });
      }
      if (f.status === "rejected") {
        items.push({
          id: `${f.id}-rejected`,
          who: "Admin HSE",
          action: "menolak temuan",
          ref: f.code,
          time: formatDateTime(f.createdAt),
          color: "var(--accent-red)",
          type: "admin",
        });
      }
    });

    return items
      .filter((a) => a.type === activityTab)
      .sort((a, b) => (a.time < b.time ? 1 : -1))
      .slice(0, 6);
  }, [findings, profiles, activityTab]);

  function setSearch(q: string) {
    if (onSearchChange) onSearchChange(q);
    else setLocalSearch(q);
  }

  function setFilter(status: string | null) {
    if (onStatusFilter) onStatusFilter(status);
    else setLocalFilter(status);
  }

  function toggleFilter(status: string | null) {
    setFilter(statusFilter === status ? null : status);
  }

  useEffect(() => {
    if (!trendRef.current) return;
    trendChart.current?.destroy();

    const { labels, newCounts, closedCounts } = buildMonthlyTrend(findings);
    const weeklyLabels = ["M1", "M2", "M3", "M4"];
    const weeklyNew = weeklyLabels.map((_, i) =>
      Math.max(0, Math.round(newCounts[newCounts.length - 1] * (0.6 + i * 0.15)))
    );
    const weeklyClosed = weeklyLabels.map((_, i) =>
      Math.max(0, Math.round(closedCounts[closedCounts.length - 1] * (0.5 + i * 0.12)))
    );

    trendChart.current = new Chart(trendRef.current, {
      type: "line",
      data: {
        labels: trendMode === "monthly" ? labels : weeklyLabels,
        datasets: [
          {
            label: "Temuan Baru",
            data: trendMode === "monthly" ? newCounts : weeklyNew,
            borderColor: "#FF8A3D",
            backgroundColor: "rgba(255, 138, 61, 0.12)",
            tension: 0.35,
            fill: true,
          },
          {
            label: "Diselesaikan",
            data: trendMode === "monthly" ? closedCounts : weeklyClosed,
            borderColor: "#22C55E",
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            tension: 0.35,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
      },
    });

    return () => trendChart.current?.destroy();
  }, [findings, trendMode]);

  useEffect(() => {
    if (!catRef.current) return;
    catChart.current?.destroy();

    const labels = categoryBreakdown.map(([name]) => name);
    const data = categoryBreakdown.map(([, count]) => count);

    catChart.current = new Chart(catRef.current, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: CHART_COLORS.slice(0, labels.length),
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: { legend: { display: false } },
      },
    });

    return () => catChart.current?.destroy();
  }, [categoryBreakdown]);

  const kpis = [
    {
      key: null,
      cls: "total",
      label: "Total Temuan",
      sub: "",
      value: stats.total,
      meta: "Seluruh registrasi",
    },
    {
      key: "open",
      cls: "open",
      label: STATUS_LABELS.open,
      sub: STATUS_DESCRIPTIONS.open,
      value: stats.open,
      meta: "Perlu unggah data after",
    },
    {
      key: "progress",
      cls: "progress",
      label: STATUS_LABELS.progress,
      sub: STATUS_DESCRIPTIONS.progress,
      value: stats.progress,
      meta: "Menunggu persetujuan admin",
    },
    {
      key: "closed",
      cls: "closed",
      label: STATUS_LABELS.closed,
      sub: STATUS_DESCRIPTIONS.closed,
      value: stats.closed,
      meta: `${stats.closedPct}% dari total`,
    },
    {
      key: "rejected",
      cls: "rejected",
      label: STATUS_LABELS.rejected,
      sub: STATUS_DESCRIPTIONS.rejected,
      value: stats.rejected,
      meta: "Perlu revisi PIC",
    },
  ];

  return (
    <>
      <div className="admin-kpi-row">
        {kpis.map((kpi) => (
          <button
            key={kpi.cls}
            type="button"
            className={`admin-kpi-card ${kpi.cls}${statusFilter === kpi.key ? " active" : ""}`}
            onClick={() => toggleFilter(kpi.key)}
          >
            <div className="admin-kpi-label">{kpi.label}</div>
            {kpi.sub && <div className="admin-kpi-sublabel">{kpi.sub}</div>}
            <div className="admin-kpi-value">{kpi.value}</div>
            <div className="admin-kpi-meta">{kpi.meta}</div>
          </button>
        ))}
      </div>

      <div className="admin-topbar" style={{ marginBottom: 16, marginTop: -4 }}>
        <div className="admin-search" style={{ flex: 1, maxWidth: 360 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            placeholder="Cari kode, lokasi, PIC..."
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-charts-row">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <div className="admin-panel-title">Tren Temuan vs Penyelesaian</div>
              <div className="admin-panel-sub">6 bulan terakhir</div>
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
          <div className="admin-chart-wrap">
            <canvas ref={trendRef} />
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <div className="admin-panel-title">Kategori Risiko</div>
              <div className="admin-panel-sub">Distribusi seluruh temuan</div>
            </div>
          </div>
          <div className="admin-chart-wrap sm">
            <canvas ref={catRef} />
          </div>
          <div className="admin-legend-list">
            {categoryBreakdown.slice(0, 5).map(([name, count], i) => (
              <div key={name} className="admin-legend-row">
                <span
                  className="admin-legend-dot"
                  style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span className="admin-legend-name">{name}</span>
                <span className="admin-legend-val">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-bottom-grid">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <div className="admin-panel-title">Temuan Terbaru</div>
              <div className="admin-panel-sub">Laporan terakhir masuk ke sistem</div>
            </div>
          {onNavigate && (
              <button type="button" className="admin-panel-link" onClick={() => onNavigate("temuan")}>
                Lihat semua →
              </button>
            )}
          </div>
          <div className="admin-table-panel" style={{ border: "none", boxShadow: "none" }}>
            <div className="mobile-only admin-mobile-card-list">
              {recentFindings.length ? (
                recentFindings.map((f) => (
                  <MobileRecordCard
                    key={f.id}
                    title={f.code}
                    subtitle={f.title || f.photoDescription || "-"}
                    badge={<AdminStatusBadge status={f.status} />}
                    sections={[
                      {
                        title: "Informasi utama",
                        fields: [
                          { label: "Lokasi", value: f.areaName },
                          { label: "Kategori", value: f.categoryName },
                          { label: "PIC", value: profileName(profiles, f.createdBy) },
                        ],
                      },
                    ]}
                    actions={
                      <button type="button" className="admin-btn" onClick={() => onViewFinding?.(f)}>
                        Buka detail
                      </button>
                    }
                  />
                ))
              ) : (
                <div className="admin-empty">Belum ada temuan yang cocok dengan filter.</div>
              )}
            </div>
            <div className="desktop-only">
              <table>
                <thead>
                  <tr>
                    <th>ID Temuan</th>
                    <th>Lokasi</th>
                    <th>Kategori</th>
                    <th>PIC</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentFindings.length ? (
                    recentFindings.map((f) => (
                      <tr key={f.id} onClick={() => onViewFinding?.(f)}>
                        <td className="admin-id-cell">{f.code}</td>
                        <td>{f.areaName}</td>
                        <td>{f.categoryName}</td>
                        <td>
                          <div className="admin-pic-cell">
                            <span className="admin-avatar">{initials(profileName(profiles, f.createdBy))}</span>
                            {profileName(profiles, f.createdBy)}
                          </div>
                        </td>
                        <td>
                          <AdminStatusBadge status={f.status} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="admin-empty">
                        Belum ada temuan yang cocok dengan filter.
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
              <div className="admin-panel-title">Riwayat Aktivitas</div>
              <div className="admin-panel-sub">Log update status &amp; komentar</div>
            </div>
            <div className="admin-seg">
              <button
                type="button"
                className={activityTab === "pic" ? "active" : ""}
                onClick={() => setActivityTab("pic")}
              >
                PIC
              </button>
              <button
                type="button"
                className={activityTab === "admin" ? "active" : ""}
                onClick={() => setActivityTab("admin")}
              >
                Admin
              </button>
            </div>
          </div>
          {activities.length ? (
            activities.map((a) => (
              <div key={a.id} className="admin-activity-item">
                <div className="admin-activity-dot" style={{ background: a.color }} />
                <div>
                  <div className="admin-activity-text">
                    <b>{a.who}</b> {a.action} <b>{a.ref}</b>
                  </div>
                  <div className="admin-activity-time">{a.time}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="admin-activity-empty">Belum ada aktivitas tercatat.</div>
          )}
        </div>
      </div>
    </>
  );
}
