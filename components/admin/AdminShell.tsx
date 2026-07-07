"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SIGAP_FULL_NAME } from "@/lib/constants";

export type AdminView = "dashboard" | "temuan" | "analisis" | "laporan" | "pic";

type AdminShellProps = {
  activeView: AdminView;
  onNavigate: (view: AdminView) => void;
  onRefresh?: () => void;
  findingsCount?: number;
  pageTitle?: string;
  pageSubtitle?: string;
  topbarExtra?: ReactNode;
  children: ReactNode;
};

const NAV_MAIN: { id: AdminView; label: string; showCount?: boolean }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "temuan", label: "Daftar Temuan", showCount: true },
  { id: "analisis", label: "Analisis Tren" },
  { id: "laporan", label: "Laporan" },
];

function IconDashboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function IconFindings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

function IconAnalytics() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  );
}

function IconReports() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function IconPic() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v1" />
    </svg>
  );
}

const VIEW_ICONS: Record<AdminView, () => React.ReactElement> = {
  dashboard: IconDashboard,
  temuan: IconFindings,
  analisis: IconAnalytics,
  laporan: IconReports,
  pic: IconPic,
};

const DEFAULT_TITLES: Record<AdminView, { title: string; sub: string }> = {
  dashboard: {
    title: "Dashboard Utama",
    sub: "Ringkasan temuan HSE — diperbarui otomatis setiap laporan baru masuk",
  },
  temuan: {
    title: "Daftar Temuan",
    sub: "Registri lengkap temuan keselamatan kerja seluruh perusahaan",
  },
  analisis: {
    title: "Analisis Tren",
    sub: "Visualisasi kinerja penanganan temuan dan performa PIC",
  },
  laporan: {
    title: "Pusat Laporan",
    sub: "Generator dan riwayat ekspor dokumen HSE",
  },
  pic: {
    title: "Master Data PIC",
    sub: "Kelola penanggung jawab temuan per departemen",
  },
};

export function AdminShell({
  activeView,
  onNavigate,
  onRefresh,
  findingsCount = 0,
  pageTitle,
  pageSubtitle,
  topbarExtra,
  children,
}: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const titles = DEFAULT_TITLES[activeView];
  const title = pageTitle ?? titles.title;
  const subtitle = pageSubtitle ?? titles.sub;

  const datetimeLabel = now
    ? now.toLocaleString("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

  function navigate(view: AdminView) {
    onNavigate(view);
    setSidebarOpen(false);
  }

  function renderNavItem(id: AdminView, label: string, showCount?: boolean) {
    const Icon = VIEW_ICONS[id];
    const active = activeView === id;
    return (
      <button
        key={id}
        type="button"
        className={`admin-nav-item${active ? " active" : ""}`}
        onClick={() => navigate(id)}
      >
        <Icon />
        {label}
        {showCount && (
          <span className="admin-nav-count">{findingsCount}</span>
        )}
      </button>
    );
  }

  return (
    <>
      <div className="admin-hazard-strip" />
      <div className="admin-shell">
        <div
          className={`admin-sidebar-backdrop${sidebarOpen ? " open" : ""}`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden={!sidebarOpen}
        />
        <aside className={`admin-sidebar${sidebarOpen ? " open" : ""}`}>
          <div className="admin-brand">
            <div className="admin-brand-mark">S</div>
            <div>
              <div className="admin-brand-name">SIGAP HSE</div>
              <div className="admin-brand-sub">{SIGAP_FULL_NAME}</div>
            </div>
          </div>

          <nav className="admin-nav">
            <div className="admin-nav-label">Menu Utama</div>
            {NAV_MAIN.map((item) =>
              renderNavItem(item.id, item.label, item.showCount)
            )}
          </nav>

          <nav className="admin-nav">
            <div className="admin-nav-label">Master Data</div>
            {renderNavItem("pic", "PIC")}
          </nav>

          <div className="admin-sidebar-foot">
            <strong>Live:</strong> Data temuan diperbarui real-time. Gunakan tombol
            segarkan untuk memuat ulang dari server.
          </div>
        </aside>

        <main className="admin-main">
          <div className="admin-topbar">
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <button
                type="button"
                className="admin-hamburger"
                onClick={() => setSidebarOpen(true)}
                aria-label="Buka menu"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <div className="admin-page-title">{title}</div>
                <div className="admin-page-sub">{subtitle}</div>
              </div>
            </div>
            <div className="admin-topbar-actions">
              <span className="admin-datetime">{datetimeLabel}</span>
              {onRefresh && (
                <button type="button" className="admin-btn" onClick={onRefresh}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-3-6.7" />
                    <path d="M21 3v6h-6" />
                  </svg>
                  Segarkan
                </button>
              )}
              {topbarExtra}
            </div>
          </div>
          {children}
        </main>
      </div>
    </>
  );
}
