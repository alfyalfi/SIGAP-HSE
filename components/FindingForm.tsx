"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "./Stepper";
import { createClient } from "@/lib/supabase/client";
import { createFinding, uploadFindingPhoto } from "@/lib/queries";
import { compressImage } from "@/lib/compress";
import { withTimeout } from "@/lib/async-utils";
import { displayErrorMessage } from "@/lib/errors";
import { MediaSourceMenu } from "./MediaSourceMenu";
import { ImageLightbox } from "./ImageLightbox";
import {
  FINDING_CATEGORIES,
  formatDateTime,
  getCategoryLabel,
  toLocalDatetimeValue,
} from "@/lib/constants";

const STEPS = ["Info Dasar", "Foto & Deskripsi", "Review"];

export function FindingForm({ companyName }: { companyName: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const [foundDatetime, setFoundDatetime] = useState(toLocalDatetimeValue());
  const [title, setTitle] = useState("");
  const [areaText, setAreaText] = useState("");
  const [tikor, setTikor] = useState("");
  const [categoryText, setCategoryText] = useState("");
  const [photoDescription, setPhotoDescription] = useState("");
  const [beforePhoto, setBeforePhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  function applyBeforePhoto(file: File | null) {
    if (!file) return;
    setBeforePhoto(file);
    setPreview((prev) => {
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
    if (s === 1 && (!foundDatetime || !title.trim() || !areaText.trim() || !categoryText)) {
      setToast(
        displayErrorMessage(
          null,
          "Lengkapi judul, area, dan kategori temuan.",
          "FORM"
        )
      );
      return false;
    }
    if (s === 2 && (!beforePhoto || !photoDescription.trim())) {
      setToast(displayErrorMessage(null, "Foto dan deskripsi wajib diisi.", "FORM"));
      return false;
    }
    setToast("");
    return true;
  }

  async function handleSubmit() {
    if (!validate(2) || !beforePhoto) return;
    setLoading(true);
    try {
      const finding = await withTimeout(
        createFinding(supabase, {
          foundDatetime: new Date(foundDatetime).toISOString(),
          title: title.trim(),
          areaText: areaText.trim(),
          categoryText,
          tikor: tikor.trim() || undefined,
          photoDescription: photoDescription.trim(),
        }),
        15000,
        "Menyimpan temuan"
      );
      const compressed = await withTimeout(compressImage(beforePhoto), 20000, "Kompresi foto");
      await withTimeout(uploadFindingPhoto(supabase, finding.id, compressed, "before"), 20000, "Upload foto");
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
        <h2>Form Temuan (Before)</h2>
        <p className="muted">Laporkan temuan PIC baru dari lapangan — 3 Step.</p>
      </div>

      <Stepper steps={STEPS} current={step} />

      <form
        className="card form-card"
        onSubmit={(e) => {
          e.preventDefault();
          setShowConfirm(true);
        }}
      >
        {step === 1 && (
          <div className="form-grid">
            <label className="full-span">
              <span>Nama PT (PIC)</span>
              <input type="text" value={companyName} readOnly />
            </label>
            <label className="full-span">
              <span>Judul Temuan</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ringkasan singkat temuan"
                required
              />
            </label>
            <label>
              <span>Tanggal & Waktu Temuan</span>
              <div className="input-with-action">
                <input
                  type="datetime-local"
                  value={foundDatetime}
                  onChange={(e) => setFoundDatetime(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setFoundDatetime(toLocalDatetimeValue())}
                >
                  Sekarang
                </button>
              </div>
            </label>
            <label>
              <span>Area / Lokasi</span>
              <input
                type="text"
                value={areaText}
                onChange={(e) => setAreaText(e.target.value)}
                placeholder="Contoh: Gudang A, Lantai 2"
                required
              />
            </label>
            <label>
              <span>Tikor (opsional)</span>
              <input
                type="text"
                value={tikor}
                onChange={(e) => setTikor(e.target.value)}
                placeholder="Koordinat atau titik lokasi"
              />
            </label>
            <label className="full-span">
              <span>Kategori</span>
              <select
                value={categoryText}
                onChange={(e) => setCategoryText(e.target.value)}
                required
              >
                <option value="">Pilih kategori</option>
                {FINDING_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {step === 2 && (
          <>
            <MediaSourceMenu
              label="Foto Temuan (Before)"
              mainLabel="Upload Before"
              cameraLabel="Buka Kamera"
              helperText="Pilih kamera untuk foto baru, atau galeri untuk file yang sudah ada."
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
                applyBeforePhoto(e.target.files?.[0] || null);
                e.currentTarget.value = "";
              }}
            />
            <input
              ref={galleryInputRef}
              className="visually-hidden-file"
              type="file"
              accept="image/*"
              onChange={(e) => {
                applyBeforePhoto(e.target.files?.[0] || null);
                e.currentTarget.value = "";
              }}
            />
            {preview && (
              <div className="photo-preview">
                <button
                  type="button"
                  className="photo-preview-item photo-preview-item-button"
                  onClick={() => setPreviewOpen(true)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="preview before" />
                  <div>{beforePhoto?.name}</div>
                </button>
              </div>
            )}
            <label className="full-span">
              <span>Deskripsi Foto / Temuan</span>
              <textarea
                value={photoDescription}
                onChange={(e) => setPhotoDescription(e.target.value)}
                rows={4}
                required
              />
            </label>
          </>
        )}

        {step === 3 && (
          <div className="review-panel">
            {[
              ["Nama PT", companyName],
              ["Judul", title],
              ["Tanggal & Waktu", formatDateTime(foundDatetime)],
              ["Area", areaText],
              ["Tikor", tikor || "-"],
              ["Kategori", getCategoryLabel(categoryText)],
              ["Deskripsi", photoDescription],
              ["Foto", beforePhoto?.name || "-"],
            ].map(([k, v]) => (
              <div key={k} className="review-item">
                <strong>{k}</strong>
                <span>{v}</span>
              </div>
            ))}
          </div>
        )}

        <div className="step-actions">
          {step > 1 && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setStep(step - 1)}
            >
              Kembali
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                if (validate(step)) setStep(step + 1);
              }}
            >
              Lanjut
            </button>
          ) : (
            <button type="submit" className="button button-primary" disabled={loading}>
              {loading ? "Menyimpan..." : "Submit Temuan"}
            </button>
          )}
        </div>
      </form>

      {showConfirm && (
        <div className="modal" role="dialog">
          <div className="modal-backdrop" onClick={() => setShowConfirm(false)} />
          <div className="modal-card card">
            <h3 className="section-title">Kirim Temuan?</h3>
            <p className="muted">
              Pastikan data sudah benar. Temuan akan tersimpan dengan status <strong>Open</strong>.
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
                {loading ? "Menyimpan..." : "Ya, Kirim"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ImageLightbox
        open={previewOpen}
        src={preview}
        alt="Preview foto before"
        title="Foto Before"
        subtitle={beforePhoto?.name || "Preview foto temuan"}
        onClose={() => setPreviewOpen(false)}
      />

      {toast && <div className="toast toast-error">{toast}</div>}
    </>
  );
}
