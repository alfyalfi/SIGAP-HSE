import { STATUS_LABELS } from "@/lib/constants";

export function AdminStatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] || status;
  return <span className={`admin-badge ${status}`}>{label}</span>;
}
