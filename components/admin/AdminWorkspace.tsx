"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { AdminShell, type AdminView } from "./AdminShell";
import { createClient } from "@/lib/supabase/client";
import {
  approveFinding,
  rejectFinding,
  getFindingById,
  updateProfile,
  type MonthlyReport,
  type Finding,
  type Profile,
} from "@/lib/queries";
import { displayErrorMessage } from "@/lib/errors";

const AdminDashboard = dynamic(() => import("./AdminDashboard").then((mod) => mod.AdminDashboard), {
  loading: () => <div className="admin-panel"><div className="admin-empty">Memuat dashboard...</div></div>,
});
const AdminFindingsList = dynamic(() => import("./AdminFindingsList").then((mod) => mod.AdminFindingsList), {
  loading: () => <div className="admin-panel"><div className="admin-empty">Memuat daftar temuan...</div></div>,
});
const AdminAnalytics = dynamic(() => import("./AdminAnalytics").then((mod) => mod.AdminAnalytics), {
  loading: () => <div className="admin-panel"><div className="admin-empty">Memuat analisis...</div></div>,
});
const AdminReports = dynamic(() => import("./AdminReports").then((mod) => mod.AdminReports), {
  loading: () => <div className="admin-panel"><div className="admin-empty">Memuat laporan...</div></div>,
});
const AdminMasterPic = dynamic(() => import("./AdminMasterPic").then((mod) => mod.AdminMasterPic), {
  loading: () => <div className="admin-panel"><div className="admin-empty">Memuat master PIC...</div></div>,
});
const AdminFindingDetail = dynamic(
  () => import("./AdminFindingDetail").then((mod) => mod.AdminFindingDetail),
  { ssr: false }
);

type AdminWorkspaceProps = {
  initialFindings: Finding[];
  initialProfiles: Profile[];
  initialReports: MonthlyReport[];
};

export function AdminWorkspace({
  initialFindings,
  initialProfiles,
  initialReports,
}: AdminWorkspaceProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [view, setView] = useState<AdminView>("dashboard");
  const [findings, setFindings] = useState(initialFindings);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [reports, setReports] = useState(initialReports);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(() => new Date());
  const detailRequestRef = useRef(0);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setFindings(initialFindings);
    setProfiles(initialProfiles);
    setReports(initialReports);
    setLastSyncedAt(new Date());
    setSyncing(false);
  }, [initialFindings, initialProfiles, initialReports]);

  const refresh = useCallback(() => {
    setSyncing(true);
    router.refresh();
  }, [router]);

  function openFinding(finding: Finding) {
    const requestId = ++detailRequestRef.current;
    setSelectedFinding(finding);
    setDetailOpen(true);
    setDetailLoading(true);
    void (async () => {
      try {
        const detailed = await getFindingById(supabase, finding.id);
        if (requestId === detailRequestRef.current && detailed) {
          setSelectedFinding(detailed);
        }
      } catch (err) {
        if (requestId === detailRequestRef.current) {
          setToast(displayErrorMessage(err, "Gagal memuat detail temuan", "ADMIN"));
        }
      } finally {
        if (requestId === detailRequestRef.current) {
          setDetailLoading(false);
        }
      }
    })();
  }

  async function handleApprove(findingId: string) {
    try {
      await approveFinding(supabase, findingId);
      setFindings((prev) =>
        prev.map((f) => (f.id === findingId ? { ...f, status: "closed" } : f))
      );
      router.refresh();
    } catch (err) {
      setToast(displayErrorMessage(err, "Gagal menyetujui", "ADMIN"));
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
      setToast(displayErrorMessage(err, "Gagal menolak", "ADMIN"));
    }
  }

  async function handleDelete(findingId: string, pin: string) {
    const res = await fetch("/api/admin/delete-finding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ findingId, pin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || displayErrorMessage(null, "Gagal menghapus temuan", "ADMIN"));
    setFindings((prev) => prev.filter((f) => f.id !== findingId));
    setSelectedFinding(null);
    router.refresh();
  }

  async function handlePicEdit(id: string, payload: { full_name: string; logoPath?: string | null }) {
    const updated = await updateProfile(supabase, id, payload);
    const nextName = updated.full_name || payload.full_name;
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
    setFindings((prev) =>
      prev.map((finding) =>
        finding.createdBy === id
          ? {
              ...finding,
              companyName: nextName,
            }
          : finding
      )
    );
    setReports((prev) =>
      prev.map((report) =>
        report.uploadedBy === id
          ? {
              ...report,
              companyName: nextName,
            }
          : report
      )
    );
    return updated;
  }

  async function handlePicAdd(payload: { full_name: string; email: string; role: string; pin: string }) {
    const res = await fetch("/api/admin/pic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", ...payload }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || displayErrorMessage(null, "Gagal menambah PIC", "ADMIN"));
    }
    const created = data.profile as Profile & { email?: string; tempPassword?: string };
    setProfiles((prev) => [created, ...prev]);
    router.refresh();
    return created;
  }

  async function handlePicDelete(id: string, pin: string) {
    const res = await fetch("/api/admin/pic", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id, pin }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || displayErrorMessage(null, "Gagal menghapus PIC", "ADMIN"));
    }
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    router.refresh();
  }

  async function handleDeleteMonthlyReports(reportIds: string[], pin: string) {
    const res = await fetch("/api/admin/delete-monthly-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportIds, pin }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || displayErrorMessage(null, "Gagal menghapus laporan.", "REPORT"));
    }
    setReports((prev) => prev.filter((report) => !reportIds.includes(report.id)));
    router.refresh();
    return data;
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
        onNavigate={(nextView) => startTransition(() => setView(nextView))}
        onRefresh={refresh}
        findingsCount={findings.length}
        lastSyncedAt={lastSyncedAt}
        syncing={syncing}
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
        {view === "temuan" && <AdminFindingsList {...dataProps} onViewFinding={openFinding} />}
        {view === "analisis" && <AdminAnalytics {...dataProps} />}
        {view === "laporan" && (
          <AdminReports {...dataProps} reports={reports} onDeleteReports={handleDeleteMonthlyReports} />
        )}
        {view === "pic" && (
          <AdminMasterPic
            {...dataProps}
            onPicEdit={handlePicEdit}
            onPicDelete={handlePicDelete}
            onPicAdd={handlePicAdd}
          />
        )}
      </AdminShell>

      <AdminFindingDetail
        finding={selectedFinding}
        profiles={profiles}
        open={detailOpen}
        loading={detailLoading}
        onClose={() => {
          detailRequestRef.current += 1;
          setDetailOpen(false);
          setDetailLoading(false);
        }}
        onApprove={handleApprove}
        onReject={handleReject}
        onDelete={handleDelete}
      />

      {toast && (
        <div className="toast toast-error" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </>
  );
}
