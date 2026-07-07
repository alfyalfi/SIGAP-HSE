export const ADMIN_EMAIL = "admin@sigap.com";

export const COMPANIES = [
  { id: "pt-01", name: "PT.Dummy 01", email: "pt-dummy-01@sigap.com" },
  { id: "pt-02", name: "PT.Dummy 02", email: "pt-dummy-02@sigap.com" },
  { id: "pt-03", name: "PT.Dummy 03", email: "pt-dummy-03@sigap.com" },
  { id: "pt-04", name: "PT.Dummy 04", email: "pt-dummy-04@sigap.com" },
  { id: "pt-05", name: "PT.Dummy 05", email: "pt-dummy-05@sigap.com" },
  { id: "pt-06", name: "PT.Dummy 06", email: "pt-dummy-06@sigap.com" },
  { id: "pt-07", name: "PT.Dummy 07", email: "pt-dummy-07@sigap.com" },
  { id: "pt-08", name: "PT.Dummy 08", email: "pt-dummy-08@sigap.com" },
  { id: "pt-09", name: "PT.Dummy 09", email: "pt-dummy-09@sigap.com" },
  { id: "pt-10", name: "PT.Dummy 10", email: "pt-dummy-10@sigap.com" },
  { id: "pt-11", name: "PT.Dummy 11", email: "pt-dummy-11@sigap.com" },
] as const;

export function getCompanyById(id: string) {
  return COMPANIES.find((c) => c.id === id);
}

export const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  progress: "On Progress",
  closed: "Closed",
  pending: "Pending",
};

export function formatDateTime(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toLocalDatetimeValue(date?: Date) {
  const d = date || new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
