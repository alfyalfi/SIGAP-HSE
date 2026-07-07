"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusBadge } from "./StatusBadge";
import { createClient } from "@/lib/supabase/client";
import { approveFinding, type Finding } from "@/lib/queries";
import { formatDateTime } from "@/lib/constants";

export function ApprovalList({ findings }: { findings: Finding[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState<string | null>(null);
  const pending = findings.filter((f) => f.status === "progress");

  async function handleApprove(id: string) {
    setLoading(id);
    try {
      await approveFinding(supabase, id);
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <div className="page-intro">
        <h2>Approval Temuan</h2>
        <p className="muted">Setujui temuan <strong>On Progress</strong> menjadi <strong>Closed</strong>.</p>
      </div>
      <div className="approval-list">
        {pending.length ? pending.map((f) => {
          const before = f.photos.find((p) => p.stage === "before");
          const after = f.photos.find((p) => p.stage === "after");
          return (
            <article key={f.id} className="approval-card card">
              <div className="approval-head">
                <div>
                  <p className="eyebrow mono">{f.code}</p>
                  <h3 className="section-title">{f.companyName}</h3>
                </div>
                <StatusBadge status={f.status} />
              </div>
              <div className="approval-meta">
                <span>{f.areaName}</span>
                <span>{f.categoryName}</span>
                <span>Selesai: {formatDateTime(f.resolvedDatetime)}</span>
              </div>
              <p>{f.photoDescription}</p>
              <div className="photo-preview">
                {before && (
                  <div className="photo-preview-item">
                    <img src={before.publicUrl} alt="before" />
                    <div>Before</div>
                  </div>
                )}
                {after && (
                  <div className="photo-preview-item">
                    <img src={after.publicUrl} alt="after" />
                    <div>After</div>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="button button-primary"
                disabled={loading === f.id}
                onClick={() => handleApprove(f.id)}
              >
                {loading === f.id ? "Menyetujui..." : "✓ Setujui (Closed)"}
              </button>
            </article>
          );
        }) : (
          <div className="card muted">Tidak ada temuan menunggu approval.</div>
        )}
      </div>
    </>
  );
}
