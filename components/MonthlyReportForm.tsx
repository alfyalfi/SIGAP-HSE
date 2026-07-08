"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadMonthlyReport, type MonthlyReport } from "@/lib/queries";
import { formatDate, formatDateTime, toLocalDateValue } from "@/lib/constants";
import { withTimeout } from "@/lib/async-utils";

export function MonthlyReportForm({
  companyName,
  reports,
}: {
  companyName: string;
  reports: MonthlyReport[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [reportDate, setReportDate] = useState(toLocalDateValue());

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("reportFile") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file || !reportDate) return;

    setLoading(true);
    try {
      await withTimeout(uploadMonthlyReport(supabase, file, reportDate, companyName), 30000, "Upload laporan");
      form.reset();
      setReportDate(toLocalDateValue());
      router.refresh();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Gagal upload");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-intro">
        <h2>Monthly Report</h2>
        <p className="muted">Unggah laporan bulanan perusahaan Anda (semua format file).</p>
      </div>
      <div className="monthly-grid">
        <form className="card" onSubmit={handleSubmit}>
          <label>
            <span>Tanggal Laporan</span>
            <div className="input-with-action">
              <input
                type="date"
                name="reportDate"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                required
              />
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setReportDate(toLocalDateValue())}
              >
                Sekarang
              </button>
            </div>
          </label>
          <label className="upload-card">
            <span>File Laporan</span>
            <input type="file" name="reportFile" required />
            <small>Mendukung Excel, PDF, Word, dan format lainnya.</small>
          </label>
          <button type="submit" className="button button-primary button-block" disabled={loading}>
            {loading ? "Mengunggah..." : "Upload Laporan"}
          </button>
        </form>

        <div className="card">
          <h3 className="section-title">Riwayat Upload</h3>
          <div className="monthly-history">
            {reports.length ? (
              reports.map((r) => (
                <div key={r.id} className="history-item">
                  <strong>{r.fileName}</strong>
                  <p className="muted">
                    {formatDate(r.reportDate || r.reportMonth)} · {formatDateTime(r.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="muted">Belum ada laporan diunggah.</p>
            )}
          </div>
        </div>
      </div>
      {toast && <div className="toast toast-error">{toast}</div>}
    </>
  );
}
