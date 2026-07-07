function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`ui-skeleton ${className}`.trim()} aria-hidden />;
}

export default function AdminLoading() {
  return (
    <div className="admin-loading">
      <div className="admin-loading-top">
        <SkeletonBlock className="skeleton-chip" />
        <SkeletonBlock className="skeleton-chip" />
        <SkeletonBlock className="skeleton-chip" />
      </div>
      <div className="admin-loading-grid">
        <SkeletonBlock className="skeleton-card" />
        <SkeletonBlock className="skeleton-card" />
        <SkeletonBlock className="skeleton-card" />
        <SkeletonBlock className="skeleton-card" />
      </div>
      <SkeletonBlock className="skeleton-panel-head" />
      <SkeletonBlock className="skeleton-panel-body" />
      <SkeletonBlock className="skeleton-panel-body" />
      <SkeletonBlock className="skeleton-panel-body" />
    </div>
  );
}
