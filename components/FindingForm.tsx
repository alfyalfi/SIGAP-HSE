"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "./Stepper";
import { createClient } from "@/lib/supabase/client";
import { createFinding, uploadFindingPhoto } from "@/lib/queries";
import { compressImage } from "@/lib/compress";
import { formatDateTime, toLocalDatetimeValue } from "@/lib/constants";

type Option = { id: string; name: string };

const STEPS = ["Info Dasar", "Foto & Deskripsi", "Review"];

export function FindingForm({
  companyName,
  areas,
  categories,
}: {
  companyName: string;
  areas: Option[];
  categories: Option[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  const [foundDatetime, setFoundDatetime] = useState(toLocalDatetimeValue());
  const [areaId, setAreaId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [photoDescription, setPhotoDescription] = useState("");
  const [beforePhoto, setBeforePhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  function validate(s: number) {
    if (s === 1 && (!foundDatetime || !areaId || !categoryId)) {
      setToast("Lengkapi tanggal, area, dan kategori.");
      return false;
    }
    if (s === 2 && (!beforePhoto || !photoDescription.trim())) {
      setToast("Foto dan deskripsi wajib diisi.");
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate(2) || !beforePhoto) return;
    setLoading(true);
    try {
      const finding = await createFinding(supabase, {
        foundDatetime: new Date(foundDatetime).toISOString(),
        areaId,
        categoryId,
        photoDescription: photoDescription.trim(),
      });
      const compressed = await compressImage(beforePhoto);
      await uploadFindingPhoto(supabase, finding.id, compressed, "before");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  }

  const areaName = areas.find((a) => a.id === areaId)?.name || "-";
  const categoryName = categories.find((c) => c.id === categoryId)?.name || "-";

  return (
    <>
      <div className="page-intro">
        <h2>Form Temuan</h2>
        <p className="muted">Laporkan temuan HSE baru dari lapangan.</p>
      </div>

      <Stepper steps={STEPS} current={step} />

      <form className="card form-card" onSubmit={handleSubmit}>
        {step === 1 && (
          <div className="form-grid">
            <label className="full-span">
              <span>Nama PT</span>
              <input type="text" value={companyName} readOnly />
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
                <button type="button" className="button button-secondary" onClick={() => setFoundDatetime(toLocalDatetimeValue())}>
                  Sekarang
                </button>
              </div>
            </label>
            <label>
              <span>Area</span>
              <select value={areaId} onChange={(e) => setAreaId(e.target.value)} required>
                <option value="">Pilih area</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
            <label>
              <span>Kategori</span>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                <option value="">Pilih kategori</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          </div>
        )}

        {step === 2 && (
          <>
            <label className="upload-card">
              <span>Foto Temuan</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setBeforePhoto(f);
                    setPreview(URL.createObjectURL(f));
                  }
                }}
                required
              />
              <small>Foto dikompresi otomatis sebelum upload.</small>
            </label>
            {preview && (
              <div className="photo-preview">
                <div className="photo-preview-item">
                  <img src={preview} alt="preview" />
                  <div>{beforePhoto?.name}</div>
                </div>
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
              ["Tanggal & Waktu", formatDateTime(foundDatetime)],
              ["Area", areaName],
              ["Kategori", categoryName],
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
            <button type="button" className="button button-secondary" onClick={() => setStep(step - 1)}>
              Kembali
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              className="button button-primary"
              onClick={() => { if (validate(step)) setStep(step + 1); }}
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

      {toast && <div className="toast toast-error">{toast}</div>}
    </>
  );
}
