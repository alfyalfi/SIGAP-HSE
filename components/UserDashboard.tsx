"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "./StatusBadge";
import { type Finding } from "@/lib/queries";
import { formatDateTime } from "@/lib/constants";

function KpiRow({ findings }: { findings: Finding[] }) {
  const cards = [
    { label: "Total", value: findings.length, cls: "", clickable: false },
    {
      label: "Open",
      value: findings.filter((f) => f.status === "open").length,
      cls: "open",
      clickable: false,
    },
    {
      label: "On Progress",
      value: findings.filter((f) => f.status === "progress").length,
      cls: "progress",
      clickable: false,
    },
    {
      label: "Closed",
      value: findings.filter((f) => f.status === "closed").length,
      cls: "closed",
      clickable: false,
    },
    {
      label: "Rejected",
      value: findings.filter((f) => f.status === "rejected").length,
      cls: "rejected",
      clickable: false,
    },
  ];
  return (
    <div className="kpi-row">
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

  return (
    <>
      <div className="page-intro dashboard-intro">
        <div>
          <h2>Dashboard Temuan</h2>
          <p className="muted">
            Klik baris <strong>open</strong> atau <strong>rejected</strong> untuk mengisi data after.
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
        <div className="filter-row">
          <label>
            <span>Status</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Semua</option>
              <option value="open">Open</option>
              <option value="progress">On Progress</option>
              <option value="closed">Closed</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
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
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="card table-card">
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
                    onClick={() => {
                      if (canUpdate(f)) router.push(`/form-after/${f.id}`);
                    }}
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
