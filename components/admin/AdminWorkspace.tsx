"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell, type AdminView } from "./AdminShell";
import { AdminDashboard } from "./AdminDashboard";
import { AdminFindingsList } from "./AdminFindingsList";
import { AdminAnalytics } from "./AdminAnalytics";
import { AdminReports } from "./AdminReports";
import { AdminMasterPic } from "./AdminMasterPic";
import { AdminFindingDetail } from "./AdminFindingDetail";
import { createClient } from "@/lib/supabase/client";
import {
  approveFinding,
  rejectFinding,
  updateProfile,
  type Finding,
  type Profile,
} from "@/lib/queries";

type AdminWorkspaceProps = {
  initialFindings: Finding[];
  initialProfiles: Profile[];
};

export function AdminWorkspace({
  initialFindings,
  initialProfiles,
}: AdminWorkspaceProps) {
  const router = useRouter();
  const supabase = createClient();
  const [view, setView] = useState<AdminView>("dashboard");
  const [findings, setFindings] = useState(initialFindings);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setFindings(initialFindings);
    setProfiles(initialProfiles);
  }, [initialFindings, initialProfiles]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  function openFinding(finding: Finding) {
    setSelectedFinding(finding);
    setDetailOpen(true);
  }

  async function handleApprove(findingId: string) {
    try {
      await approveFinding(supabase, findingId);
      setFindings((prev) =>
        prev.map((f) => (f.id === findingId ? { ...f, status: "closed" } : f))
      );
      router.refresh();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Gagal menyetujui");
    }
  }

  async function handleReject(findingId: string) {
    try {
      await rejectFinding(supabase, findingId);
      setFindings((prev) =>
        prev.map((f) => (f.id === findingId ? { ...f, status: "rejected" } : f))
      );
      router.refresh();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Gagal menolak");
    }
  }

  async function handlePicEdit(id: string, payload: { full_name: string }) {
    const updated = await updateProfile(supabase, id, payload);
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
  }

  async function handlePicDelete(id: string) {
    await updateProfile(supabase, id, { is_active: false });
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  }

  const dataProps = {
    findings,
    profiles,
    onRefresh: refresh,
    onApprove: handleApprove,
    onReject: handleReject,
  };

  return (
    <>
      <AdminShell
        activeView={view}
        onNavigate={setView}
        onRefresh={refresh}
        findingsCount={findings.length}
        topbarExtra={
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
              router.refresh();
            }}
          >
            Logout
          </button>
        }
      >
        {view === "dashboard" && (
          <AdminDashboard
            {...dataProps}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            onViewFinding={openFinding}
            onNavigate={setView}
          />
        )}
        {view === "temuan" && (
          <AdminFindingsList {...dataProps} onViewFinding={openFinding} />
        )}
        {view === "analisis" && <AdminAnalytics {...dataProps} />}
        {view === "laporan" && <AdminReports {...dataProps} />}
        {view === "pic" && (
          <AdminMasterPic
            {...dataProps}
            onPicEdit={handlePicEdit}
            onPicDelete={handlePicDelete}
            onPicAdd={async () => {
              setToast(
                "Untuk menambah PIC baru, buat user di Supabase Auth lalu update profil di sini."
              );
            }}
          />
        )}
      </AdminShell>

      <AdminFindingDetail
        finding={selectedFinding}
        profiles={profiles}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {toast && (
        <div className="toast toast-error" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </>
  );
}
