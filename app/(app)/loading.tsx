function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`ui-skeleton ${className}`.trim()} aria-hidden />;
}

export default function AppLoading() {
  return (
    <div className="page-loading-surface" role="status" aria-live="polite">
      <div className="page-loading-shell">
        <div className="page-loading">
          <div className="page-loading-spinner" />
          <div className="muted">Memuat halaman SIGAP...</div>
        </div>
        <div className="page-loading-hero">
          <SkeletonBlock className="skeleton-title" />
          <SkeletonBlock className="skeleton-subtitle" />
          <div className="page-loading-chip-row">
            <SkeletonBlock className="skeleton-chip" />
            <SkeletonBlock className="skeleton-chip" />
            <SkeletonBlock className="skeleton-chip" />
          </div>
        </div>
        <div className="page-loading-grid">
          <SkeletonBlock className="skeleton-card" />
          <SkeletonBlock className="skeleton-card" />
          <SkeletonBlock className="skeleton-card" />
          <SkeletonBlock className="skeleton-card" />
        </div>
        <div className="page-loading-panel">
          <SkeletonBlock className="skeleton-panel-head" />
          <SkeletonBlock className="skeleton-panel-body" />
          <SkeletonBlock className="skeleton-panel-body" />
          <SkeletonBlock className="skeleton-panel-body" />
        </div>
      </div>
    </div>
  );
}
