import { STATUS_LABELS } from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] || status;
  return <span className={`status-badge status-${status}`}>{label}</span>;
}
