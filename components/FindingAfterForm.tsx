"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "./Stepper";
import { createClient } from "@/lib/supabase/client";
import { submitProgressUpdate, uploadFindingPhoto, type Finding } from "@/lib/queries";
import { compressImage } from "@/lib/compress";
import { withTimeout } from "@/lib/async-utils";
import { displayErrorMessage } from "@/lib/errors";
import { MediaSourceMenu } from "./MediaSourceMenu";
import { ImageLightbox } from "./ImageLightbox";
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
  const [beforePreviewOpen, setBeforePreviewOpen] = useState(false);
  const [afterPreviewOpen, setAfterPreviewOpen] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const beforePhoto = finding.photos.find((p) => p.stage === "before");
  const minDatetime = toLocalDatetimeValue(
    new Date(finding.foundDatetime || finding.foundAt)
  );

  useEffect(() => {
    return () => {
      if (afterPreview.startsWith("blob:")) {
        URL.revokeObjectURL(afterPreview);
      }
    };
  }, [afterPreview]);

  function applyAfterPhoto(file: File | null) {
    if (!file) return;
    setAfterPhoto(file);
    setAfterPreview((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  function triggerCameraInput() {
    cameraInputRef.current?.click();
  }

  function triggerGalleryInput() {
    galleryInputRef.current?.click();
  }

  function validate(s: number) {
    if (s === 1 && (!afterPhoto || !afterDescription.trim())) {
      setToast(displayErrorMessage(null, "Foto after dan deskripsi wajib diisi.", "FORM"));
      return false;
    }
    const resolvedDt = new Date(resolvedDatetime);
    const foundDt = new Date(finding.foundDatetime || finding.foundAt);
    if (resolvedDt < foundDt) {
      setToast(
        displayErrorMessage(
          null,
          "Tanggal penyelesaian tidak boleh sebelum tanggal temuan.",
          "FORM"
        )
      );
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
      setToast(displayErrorMessage(err, "Gagal menyimpan", "FORM"));
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
                <button
                  type="button"
                  className="photo-preview-item photo-preview-item-button"
                  onClick={() => setBeforePreviewOpen(true)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={beforePhoto.publicUrl} alt="before" />
                  <div>Foto before tersimpan</div>
                </button>
              </div>
            )}

            <MediaSourceMenu
              label="Foto After"
              mainLabel="Upload After"
              cameraLabel="Buka Kamera"
              helperText="Ambil foto baru atau pilih file dari galeri perangkat."
              onMainClick={triggerGalleryInput}
              onCameraClick={triggerCameraInput}
            />
            <input
              ref={cameraInputRef}
              className="visually-hidden-file"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                applyAfterPhoto(e.target.files?.[0] || null);
                e.currentTarget.value = "";
              }}
            />
            <input
              ref={galleryInputRef}
              className="visually-hidden-file"
              type="file"
              accept="image/*"
              onChange={(e) => {
                applyAfterPhoto(e.target.files?.[0] || null);
                e.currentTarget.value = "";
              }}
            />
            {afterPreview && (
              <div className="photo-preview">
                <button
                  type="button"
                  className="photo-preview-item photo-preview-item-button"
                  onClick={() => setAfterPreviewOpen(true)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={afterPreview} alt="after" />
                  <div>{afterPhoto?.name}</div>
                </button>
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

      <ImageLightbox
        open={beforePreviewOpen}
        src={beforePhoto?.publicUrl || ""}
        alt="Preview foto before"
        title="Foto Before"
        subtitle={finding.code}
        onClose={() => setBeforePreviewOpen(false)}
      />
      <ImageLightbox
        open={afterPreviewOpen}
        src={afterPreview}
        alt="Preview foto after"
        title="Foto After"
        subtitle={afterPhoto?.name || finding.code}
        onClose={() => setAfterPreviewOpen(false)}
      />

      {toast && <div className="toast toast-error">{toast}</div>}
    </>
  );
}
