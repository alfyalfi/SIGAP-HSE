"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "./StatusBadge";
import { Stepper } from "./Stepper";
import { createClient } from "@/lib/supabase/client";
import { submitProgressUpdate, uploadFindingPhoto, type Finding } from "@/lib/queries";
import { compressImage } from "@/lib/compress";
import { formatDateTime, toLocalDatetimeValue } from "@/lib/constants";

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

export function UserDashboard({ findings }: { findings: Finding[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [selected, setSelected] = useState<Finding | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [updateStep, setUpdateStep] = useState(1);
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);
  const [afterPreview, setAfterPreview] = useState("");
  const [resolvedDatetime, setResolvedDatetime] = useState(toLocalDatetimeValue());
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  function openUpdate(finding: Finding) {
    setSelected(finding);
    setShowConfirm(true);
  }

  function startUpdate() {
    setShowConfirm(false);
    const min = findingMinDatetime(selected);
    setResolvedDatetime(toLocalDatetimeValue(new Date()));
    setAfterPhoto(null);
    setAfterPreview("");
    setUpdateStep(1);
    setShowUpdate(true);
    if (min) {
      const input = document.getElementById("resolved-datetime") as HTMLInputElement | null;
      if (input) input.min = min;
    }
  }

  function findingMinDatetime(finding: Finding | null) {
    if (!finding) return "";
    return toLocalDatetimeValue(new Date(finding.foundDatetime || finding.foundAt));
  }

  async function submitUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !afterPhoto) return;
    const foundDt = new Date(selected.foundDatetime || selected.foundAt);
    const resolvedDt = new Date(resolvedDatetime);
    if (resolvedDt < foundDt) {
      setToast("Tanggal penyelesaian tidak boleh sebelum tanggal temuan.");
      return;
    }
    setLoading(true);
    try {
      const compressed = await compressImage(afterPhoto);
      await uploadFindingPhoto(supabase, selected.id, compressed, "after");
      await submitProgressUpdate(supabase, selected.id, resolvedDt.toISOString());
      setShowUpdate(false);
      router.refresh();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Gagal update");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-intro">
        <h2>Dashboard Temuan</h2>
        <p className="muted">Klik baris <strong>open</strong> untuk update tindak lanjut.</p>
      </div>

      <KpiRow findings={findings} />

      <div className="card table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Tanggal</th>
                <th>Area</th>
                <th>Kategori</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {findings.length ? findings.map((f) => (
                <tr
                  key={f.id}
                  className={f.status === "open" ? "row-clickable" : ""}
                  onClick={() => f.status === "open" && openUpdate(f)}
                >
                  <td className="mono">{f.code}</td>
                  <td>{formatDateTime(f.foundDatetime || f.foundAt)}</td>
                  <td>{f.areaName}</td>
                  <td>{f.categoryName}</td>
                  <td><StatusBadge status={f.status} /></td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="muted">Belum ada temuan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showConfirm && (
        <div className="modal" role="dialog">
          <div className="modal-backdrop" onClick={() => setShowConfirm(false)} />
          <div className="modal-card card">
            <h3 className="section-title">Update Temuan?</h3>
            <p className="muted">Lanjutkan update tindak lanjut untuk temuan ini?</p>
            <div className="modal-actions">
              <button type="button" className="button button-secondary" onClick={() => setShowConfirm(false)}>Tidak</button>
              <button type="button" className="button button-primary" onClick={startUpdate}>Ya, Lanjutkan</button>
            </div>
          </div>
        </div>
      )}

      {showUpdate && selected && (
        <div className="modal" role="dialog">
          <div className="modal-backdrop" onClick={() => setShowUpdate(false)} />
          <div className="modal-card card modal-wide">
            <div className="section-head">
              <h3 className="section-title">Update Tindak Lanjut</h3>
              <button type="button" className="button button-ghost" onClick={() => setShowUpdate(false)}>✕</button>
            </div>
            <Stepper steps={["Foto After", "Review"]} current={updateStep} compact />
            <form onSubmit={submitUpdate}>
              {updateStep === 1 && (
                <>
                  <label className="upload-card">
                    <span>Foto After</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) { setAfterPhoto(f); setAfterPreview(URL.createObjectURL(f)); }
                      }}
                      required
                    />
                  </label>
                  {afterPreview && (
                    <div className="photo-preview">
                      <div className="photo-preview-item">
                        <img src={afterPreview} alt="after" />
                        <div>{afterPhoto?.name}</div>
                      </div>
                    </div>
                  )}
                  <label>
                    <span>Tanggal & Waktu Penyelesaian</span>
                    <div className="input-with-action">
                      <input
                        id="resolved-datetime"
                        type="datetime-local"
                        value={resolvedDatetime}
                        min={findingMinDatetime(selected)}
                        onChange={(e) => setResolvedDatetime(e.target.value)}
                        required
                      />
                      <button type="button" className="button button-secondary" onClick={() => setResolvedDatetime(toLocalDatetimeValue())}>
                        Sekarang
                      </button>
                    </div>
                  </label>
                </>
              )}
              {updateStep === 2 && (
                <div className="review-panel">
                  {[
                    ["Kode", selected.code],
                    ["Foto After", afterPhoto?.name],
                    ["Penyelesaian", formatDateTime(resolvedDatetime)],
                    ["Status Baru", "On Progress"],
                  ].map(([k, v]) => (
                    <div key={k} className="review-item"><strong>{k}</strong><span>{v}</span></div>
                  ))}
                </div>
              )}
              <div className="step-actions">
                {updateStep > 1 && (
                  <button type="button" className="button button-secondary" onClick={() => setUpdateStep(1)}>Kembali</button>
                )}
                {updateStep < 2 ? (
                  <button type="button" className="button button-primary" onClick={() => afterPhoto ? setUpdateStep(2) : setToast("Foto after wajib")}>
                    Lanjut
                  </button>
                ) : (
                  <button type="submit" className="button button-primary" disabled={loading}>
                    {loading ? "Mengirim..." : "Submit Update"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className="toast toast-error">{toast}</div>}
    </>
  );
}
