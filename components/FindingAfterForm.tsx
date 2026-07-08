"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "./Stepper";
import { createClient } from "@/lib/supabase/client";
import { submitProgressUpdate, uploadFindingPhoto, type Finding } from "@/lib/queries";
import { compressImage } from "@/lib/compress";
import { withTimeout } from "@/lib/async-utils";
import {
  formatDateTime,
  getCategoryLabel,
  toLocalDatetimeValue,
} from "@/lib/constants";

const STEPS = ["Data After", "Review"];

export function FindingAfterForm({ finding }: { finding: Finding }) {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);
  const [afterPreview, setAfterPreview] = useState("");
  const [afterDescription, setAfterDescription] = useState("");
  const [resolvedDatetime, setResolvedDatetime] = useState(toLocalDatetimeValue());

  const beforePhoto = finding.photos.find((p) => p.stage === "before");
  const minDatetime = toLocalDatetimeValue(
    new Date(finding.foundDatetime || finding.foundAt)
  );

  function validate(s: number) {
    if (s === 1 && (!afterPhoto || !afterDescription.trim())) {
      setToast("Foto after dan deskripsi wajib diisi.");
      return false;
    }
    const resolvedDt = new Date(resolvedDatetime);
    const foundDt = new Date(finding.foundDatetime || finding.foundAt);
    if (resolvedDt < foundDt) {
      setToast("Tanggal penyelesaian tidak boleh sebelum tanggal temuan.");
      return false;
    }
    setToast("");
    return true;
  }

  async function handleSubmit() {
    if (!validate(1) || !afterPhoto) return;
    setLoading(true);
    try {
      const compressed = await withTimeout(compressImage(afterPhoto), 20000, "Kompresi foto");
      await withTimeout(uploadFindingPhoto(supabase, finding.id, compressed, "after"), 20000, "Upload foto");
      await withTimeout(
        submitProgressUpdate(supabase, finding.id, {
          resolvedDatetime: new Date(resolvedDatetime).toISOString(),
          afterDescription: afterDescription.trim(),
        }),
        15000,
        "Menyimpan tindak lanjut"
      );
      setShowConfirm(false);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-intro">
        <h2>Form Temuan (After)</h2>
        <p className="muted">
          Temuan <span className="mono">{finding.code}</span> — lengkapi data tindak lanjut.
        </p>
      </div>

      <Stepper steps={STEPS} current={step} />

      <form
        className="card form-card"
        onSubmit={(e) => {
          e.preventDefault();
          if (validate(1)) setShowConfirm(true);
        }}
      >
        {step === 1 && (
          <>
            <div className="review-panel readonly-panel">
              {[
                ["Judul", finding.title],
                ["Tanggal Temuan", formatDateTime(finding.foundDatetime || finding.foundAt)],
                ["Area", finding.areaName],
                ["Kategori", getCategoryLabel(finding.categoryText) || finding.categoryName],
                ["Tikor", finding.tikor || "-"],
              ].map(([k, v]) => (
                <div key={k} className="review-item">
                  <strong>{k}</strong>
                  <span>{v}</span>
                </div>
              ))}
            </div>

            {beforePhoto && (
              <div className="photo-preview">
                <p className="section-title">Foto Before</p>
                <div className="photo-preview-item">
                  <img src={beforePhoto.publicUrl} alt="before" />
                </div>
              </div>
            )}

            <label className="upload-card">
              <span>Foto After</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setAfterPhoto(f);
                    setAfterPreview(URL.createObjectURL(f));
                  }
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

            <label className="full-span">
              <span>Deskripsi Tindak Lanjut</span>
              <textarea
                value={afterDescription}
                onChange={(e) => setAfterDescription(e.target.value)}
                rows={4}
                placeholder="Jelaskan perbaikan yang telah dilakukan"
                required
              />
            </label>

            <label>
              <span>Tanggal & Waktu Penyelesaian</span>
              <div className="input-with-action">
                <input
                  type="datetime-local"
                  value={resolvedDatetime}
                  min={minDatetime}
                  onChange={(e) => setResolvedDatetime(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setResolvedDatetime(toLocalDatetimeValue())}
                >
                  Sekarang
                </button>
              </div>
            </label>
          </>
        )}

        {step === 2 && (
          <div className="review-panel">
            {[
              ["Kode", finding.code],
              ["Judul", finding.title],
              ["Foto After", afterPhoto?.name],
              ["Deskripsi After", afterDescription],
              ["Penyelesaian", formatDateTime(resolvedDatetime)],
              ["Status Baru", "On Progress"],
            ].map(([k, v]) => (
              <div key={k} className="review-item">
                <strong>{k}</strong>
                <span>{v}</span>
              </div>
            ))}
          </div>
        )}

        <div className="step-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => router.push("/dashboard")}
          >
            Batal
          </button>
          {step > 1 && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setStep(1)}
            >
              Kembali
            </button>
          )}
          {step < 2 ? (
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                if (validate(1)) setStep(2);
              }}
            >
              Lanjut Review
            </button>
          ) : (
            <button type="submit" className="button button-primary" disabled={loading}>
              {loading ? "Mengirim..." : "Submit Update"}
            </button>
          )}
        </div>
      </form>

      {showConfirm && (
        <div className="modal" role="dialog">
          <div className="modal-backdrop" onClick={() => setShowConfirm(false)} />
          <div className="modal-card card">
            <h3 className="section-title">Kirim Data After?</h3>
            <p className="muted">
              Temuan akan berstatus <strong>On Progress</strong> dan menunggu approval admin.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setShowConfirm(false)}
              >
                Periksa Lagi
              </button>
              <button
                type="button"
                className="button button-primary"
                disabled={loading}
                onClick={handleSubmit}
              >
                {loading ? "Mengirim..." : "Ya, Kirim"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast toast-error">{toast}</div>}
    </>
  );
}
