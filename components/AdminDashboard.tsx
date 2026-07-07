import { StatusBadge } from "./StatusBadge";
import { formatDateTime } from "@/lib/constants";
import type { Finding } from "@/lib/queries";

function KpiRow({ findings }: { findings: Finding[] }) {
  const cards = [
    { label: "Total", value: findings.length, cls: "" },
    { label: "Open", value: findings.filter((f) => f.status === "open").length, cls: "open" },
    { label: "On Progress", value: findings.filter((f) => f.status === "progress").length, cls: "progress" },
    { label: "Closed", value: findings.filter((f) => f.status === "closed").length, cls: "closed" },
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

export function AdminDashboard({ findings }: { findings: Finding[] }) {
  return (
    <>
      <div className="page-intro">
        <h2>Dashboard Admin</h2>
        <p className="muted">Semua temuan dari seluruh perusahaan.</p>
      </div>
      <KpiRow findings={findings} />
      <div className="card table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Perusahaan</th>
                <th>Tanggal</th>
                <th>Area</th>
                <th>Kategori</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {findings.length ? findings.map((f) => (
                <tr key={f.id}>
                  <td className="mono">{f.code}</td>
                  <td>{f.companyName}</td>
                  <td>{formatDateTime(f.foundDatetime || f.foundAt)}</td>
                  <td>{f.areaName}</td>
                  <td>{f.categoryName}</td>
                  <td><StatusBadge status={f.status} /></td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="muted">Belum ada temuan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
