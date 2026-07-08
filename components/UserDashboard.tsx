"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "./StatusBadge";
import { MobileRecordCard } from "./MobileRecordCard";
import { type Finding } from "@/lib/queries";
import { formatDateTime } from "@/lib/constants";

function KpiRow({ findings }: { findings: Finding[] }) {
  const cards = [
    { label: "Total", value: findings.length, cls: "" },
    { label: "Open", value: findings.filter((f) => f.status === "open").length, cls: "open" },
    { label: "Progress", value: findings.filter((f) => f.status === "progress").length, cls: "progress" },
    { label: "Closed", value: findings.filter((f) => f.status === "closed").length, cls: "closed" },
    { label: "Rejected", value: findings.filter((f) => f.status === "rejected").length, cls: "rejected" },
  ];
  return (
    <div className="kpi-row kpi-row-scroll">
      {cards.map((c) => (
        <div key={c.label} className={`kpi-card kpi-${c.cls}`}>
          <p>{c.label}</p>
          <strong>{c.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function UserDashboard({ findings }: { findings: Finding[] }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const areas = useMemo(
    () => [...new Set(findings.map((f) => f.areaName).filter((a) => a && a !== "-"))].sort(),
    [findings]
  );

  const filtered = useMemo(() => {
    return findings.filter((f) => {
      if (statusFilter && f.status !== statusFilter) return false;
      if (areaFilter && f.areaName !== areaFilter) return false;
      if (dateFrom && (f.foundDatetime || f.foundAt).slice(0, 10) < dateFrom) return false;
      return true;
    });
  }, [findings, statusFilter, areaFilter, dateFrom]);

  async function handleRefresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 600);
  }

  function canUpdate(f: Finding) {
    return f.status === "open" || f.status === "rejected";
  }

  function openFinding(f: Finding) {
    if (canUpdate(f)) router.push(`/form-after/${f.id}`);
  }

  return (
    <>
      <div className="page-intro dashboard-intro">
        <div>
          <h2>Dashboard Temuan</h2>
          <p className="muted">
            Ketuk temuan <strong>open</strong> / <strong>rejected</strong> untuk isi data after.
          </p>
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

      <KpiRow findings={findings} />

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
                  disabled={!canUpdate(f)}
                >
                  {canUpdate(f) ? "Lanjutkan" : "Belum dapat diproses"}
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
                    className={canUpdate(f) ? "row-clickable" : ""}
                    onClick={() => openFinding(f)}
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
    </>
  );
}
