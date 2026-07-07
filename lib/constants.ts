export const ADMIN_EMAIL = "admin@sigap.com";

export const SIGAP_FULL_NAME = "Sistem Informasi Guna Audit dan Penyelesaian";

export const SIGAP_COPYRIGHT = "SIGAP 2026 - Alfaristudio";

export const FINDING_CATEGORIES = [
  { value: "unsafe_act", label: "Unsafe Act" },
  { value: "unsafe_condition", label: "Unsafe Condition" },
  { value: "near_miss", label: "Near Miss" },
] as const;

export const COMPANIES = [
  { id: "pt-ljs", name: "PT Lautan Jaya Semesta", email: "pt-ljs@sigap.com" },
  { id: "wimas", name: "WIMAS", email: "wimas@sigap.com" },
  { id: "pt-centrindo", name: "PT CENTRINDO PALMAX", email: "pt-centrindo@sigap.com" },
  { id: "pt-patama", name: "PT PATAMA ADIJAYA STEEL", email: "pt-patama@sigap.com" },
  { id: "pt-guna", name: "PT GUNA TEKNIK PERKASA", email: "pt-guna@sigap.com" },
  { id: "pt-aura", name: "PT AURA MUDA PRATAMA", email: "pt-aura@sigap.com" },
  { id: "cv-lancar", name: "CV LANCAR UTAMA CIPTA KARYA", email: "cv-lancar@sigap.com" },
  { id: "pt-ravi", name: "PT RAVI JAYA MANDIRI", email: "pt-ravi@sigap.com" },
  { id: "pt-rizal", name: "PT RIZAL BERKAH BERSAMA", email: "pt-rizal@sigap.com" },
  { id: "pt-muazta", name: "PT MUAZTA BINAKA SEJAHTERA", email: "pt-muazta@sigap.com" },
  { id: "pt-cakra", name: "PT CAKRA INDO PRATAMA", email: "pt-cakra@sigap.com" },
  { id: "cv-putri", name: "CV PUTRI PRATAMA", email: "cv-putri@sigap.com" },
] as const;

export function getCompanyById(id: string) {
  return COMPANIES.find((c) => c.id === id);
}

export function getCategoryLabel(value?: string | null) {
  return FINDING_CATEGORIES.find((c) => c.value === value)?.label || value || "-";
}

export const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  progress: "On Progress",
  closed: "Closed",
  rejected: "Rejected",
};

export const STATUS_DESCRIPTIONS: Record<string, string> = {
  open: "Menunggu Data After",
  progress: "Menunggu Approval",
  closed: "Selesai Disetujui",
  rejected: "Ditolak Admin",
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

export function formatDate(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function toLocalDatetimeValue(date?: Date) {
  const d = date || new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toLocalDateValue(date?: Date) {
  const d = date || new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function getGreeting(name?: string) {
  const hour = new Date().getHours();
  let period = "Malam";
  if (hour >= 5 && hour < 11) period = "Pagi";
  else if (hour >= 11 && hour < 15) period = "Siang";
  else if (hour >= 15 && hour < 18) period = "Sore";

  const who = name ? `, ${name}` : "";
  return `Selamat ${period}${who}`;
}
