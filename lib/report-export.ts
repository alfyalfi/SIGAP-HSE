import ExcelJS, {
  type Cell,
  type ConditionalFormattingOptions,
  type ConditionalFormattingRule,
  type ContainsTextRuleType,
  type Worksheet,
} from "exceljs";
import { formatDateTime, STATUS_LABELS } from "@/lib/constants";
import type { Finding, Profile } from "@/lib/queries";

export type ExportFilters = {
  status: string;
  area: string;
  category: string;
  company: string;
  dateFrom: string;
  dateTo: string;
};

export type FindingExportRow = {
  no: number;
  code: string;
  title: string;
  foundAt: Date;
  foundAtText: string;
  area: string;
  category: string;
  tikor: string;
  pic: string;
  company: string;
  status: string;
  statusLabel: string;
  resolvedAt: Date | null;
  resolvedAtText: string;
  createdAt: Date;
  createdAtText: string;
  beforePhotos: number;
  afterPhotos: number;
  photoDescription: string;
  afterDescription: string;
};

export type ExportSummary = {
  total: number;
  open: number;
  progress: number;
  closed: number;
  rejected: number;
  closedRate: number;
};

export type CategoryBreakdown = {
  name: string;
  count: number;
};

export type ExportContext = {
  title: string;
  generatedAt: string;
  filters: ExportFilters;
  rows: FindingExportRow[];
  summary: ExportSummary;
  categoryBreakdown: CategoryBreakdown[];
};

export type ExportColumn = {
  key: keyof FindingExportRow;
  header: string;
  width: number;
  type: "text" | "date" | "number";
  alignment?: "left" | "center" | "right";
  accessor: (row: FindingExportRow) => string | number | Date | null;
};

const DEFAULT_STATUS_LABELS: Record<string, string> = STATUS_LABELS;

export const FINDING_EXPORT_COLUMNS: ExportColumn[] = [
  { key: "no", header: "No", width: 6, type: "number", alignment: "center", accessor: (row) => row.no },
  { key: "code", header: "Kode Temuan", width: 16, type: "text", accessor: (row) => row.code },
  { key: "foundAt", header: "Tanggal Temuan", width: 19, type: "date", accessor: (row) => row.foundAt },
  { key: "title", header: "Judul", width: 28, type: "text", accessor: (row) => row.title },
  { key: "area", header: "Area", width: 20, type: "text", accessor: (row) => row.area },
  { key: "category", header: "Kategori", width: 18, type: "text", accessor: (row) => row.category },
  { key: "tikor", header: "TIKOR", width: 16, type: "text", accessor: (row) => row.tikor },
  { key: "pic", header: "PIC", width: 20, type: "text", accessor: (row) => row.pic },
  { key: "company", header: "Perusahaan", width: 22, type: "text", accessor: (row) => row.company },
  { key: "statusLabel", header: "Status", width: 16, type: "text", accessor: (row) => row.statusLabel },
  { key: "resolvedAt", header: "Tgl. Selesai", width: 19, type: "date", accessor: (row) => row.resolvedAt },
  { key: "createdAt", header: "Dibuat Pada", width: 19, type: "date", accessor: (row) => row.createdAt },
  { key: "beforePhotos", header: "Before", width: 10, type: "number", alignment: "center", accessor: (row) => row.beforePhotos },
  { key: "afterPhotos", header: "After", width: 10, type: "number", alignment: "center", accessor: (row) => row.afterPhotos },
  { key: "photoDescription", header: "Deskripsi", width: 30, type: "text", accessor: (row) => row.photoDescription },
  { key: "afterDescription", header: "Tindakan After", width: 30, type: "text", accessor: (row) => row.afterDescription },
];

function profileName(profiles: Profile[], id: string) {
  return profiles.find((p) => p.id === id)?.full_name || "PIC";
}

function toDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildFindingExportRows(findings: Finding[], profiles: Profile[]) {
  return findings.map((finding, index) => {
    const foundAt = toDate(finding.foundDatetime || finding.foundAt) || new Date();
    const resolvedAt = toDate(finding.resolvedDatetime);
    const beforePhotos = finding.photos.filter((photo) => photo.stage === "before").length;
    const afterPhotos = finding.photos.filter((photo) => photo.stage === "after").length;
    const statusLabel = DEFAULT_STATUS_LABELS[finding.status] || finding.status;

    return {
      no: index + 1,
      code: finding.code,
      title: finding.title || finding.photoDescription || "-",
      foundAt,
      foundAtText: formatDateTime(foundAt.toISOString()),
      area: finding.areaName,
      category: finding.categoryName,
      tikor: finding.tikor || "-",
      pic: profileName(profiles, finding.createdBy),
      company: finding.companyName,
      status: finding.status,
      statusLabel,
      resolvedAt,
      resolvedAtText: resolvedAt ? formatDateTime(resolvedAt.toISOString()) : "-",
      createdAt: toDate(finding.createdAt) || new Date(),
      createdAtText: formatDateTime(finding.createdAt),
      beforePhotos,
      afterPhotos,
      photoDescription: finding.photoDescription || "-",
      afterDescription: finding.afterDescription || "-",
    } satisfies FindingExportRow;
  });
}

export function filterFindingsForExport(findings: Finding[], filters: ExportFilters) {
  return findings.filter((finding) => {
    const foundDate = (finding.foundDatetime || finding.foundAt).slice(0, 10);
    if (filters.status && finding.status !== filters.status) return false;
    if (filters.area && finding.areaName !== filters.area) return false;
    if (filters.category && finding.categoryName !== filters.category) return false;
    if (filters.company && finding.companyName !== filters.company) return false;
    if (filters.dateFrom && foundDate < filters.dateFrom) return false;
    if (filters.dateTo && foundDate > filters.dateTo) return false;
    return true;
  });
}

export function buildExportSummary(rows: FindingExportRow[]): ExportSummary {
  const total = rows.length;
  const open = rows.filter((row) => row.status === "open").length;
  const progress = rows.filter((row) => row.status === "progress").length;
  const closed = rows.filter((row) => row.status === "closed").length;
  const rejected = rows.filter((row) => row.status === "rejected").length;
  const closedRate = total ? Math.round((closed / total) * 100) : 0;
  return { total, open, progress, closed, rejected, closedRate };
}

export function buildCategoryBreakdown(rows: FindingExportRow[]) {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const key = row.category || "Lainnya";
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));
}

export function buildExportContext(findings: Finding[], profiles: Profile[], filters: ExportFilters, title = "SIGAP HSE Laporan"): ExportContext {
  const rows = buildFindingExportRows(findings, profiles);
  return {
    title,
    generatedAt: new Date().toISOString(),
    filters,
    rows,
    summary: buildExportSummary(rows),
    categoryBreakdown: buildCategoryBreakdown(rows),
  };
}

export function getFindingExportHeaders() {
  return FINDING_EXPORT_COLUMNS.map((column) => column.header);
}

export function getFindingExportMatrix(rows: FindingExportRow[]) {
  return rows.map((row) => FINDING_EXPORT_COLUMNS.map((column) => column.accessor(row)));
}

export function getFindingExportCsvMatrix(rows: FindingExportRow[]) {
  return rows.map((row) =>
    FINDING_EXPORT_COLUMNS.map((column) => {
      const value = column.accessor(row);
      if (value instanceof Date) return value.toISOString();
      return String(value ?? "");
    })
  );
}

function ensureCanvas() {
  if (typeof document === "undefined") {
    throw new Error("Canvas tidak tersedia di lingkungan ini.");
  }
  const canvas = document.createElement("canvas");
  return canvas;
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawLabelValueCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  title: string,
  value: string,
  accent: string
) {
  drawRoundedRect(ctx, x, y, width, 120, 18);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.fillRect(x, y, 6, 120);
  ctx.fillStyle = "#6B7280";
  ctx.font = '700 13px "Times New Roman"';
  ctx.fillText(title, x + 22, y + 32);
  ctx.fillStyle = "#111827";
  ctx.font = '700 34px "Times New Roman"';
  ctx.fillText(value, x + 22, y + 82);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function createSummaryChartDataUrl(context: ExportContext) {
  const canvas = ensureCanvas();
  canvas.width = 1400;
  canvas.height = 760;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context tidak tersedia.");

  ctx.fillStyle = "#F4F5F9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#111827";
  drawRoundedRect(ctx, 24, 24, 1352, 108, 24);
  ctx.fill();

  ctx.fillStyle = "#FBBF24";
  drawRoundedRect(ctx, 24, 124, 1352, 8, 999);
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = '700 38px "Times New Roman"';
  ctx.fillText(context.title, 56, 72);
  ctx.font = '400 18px Arial';
  ctx.fillText(`Diekspor ${formatDateTime(context.generatedAt)} | Data terpilih: ${context.summary.total}`, 56, 104);

  const cards = [
    ["Total", String(context.summary.total), "#FBBF24"],
    ["Open", String(context.summary.open), "#EF4444"],
    ["Progress", String(context.summary.progress), "#F59E0B"],
    ["Closed", `${context.summary.closed} (${context.summary.closedRate}%)`, "#22C55E"],
  ];

  cards.forEach((card, index) => {
    const x = 56 + index * 320;
    drawLabelValueCard(ctx, x, 168, 284, card[0], card[1], card[2]);
  });

  const statusBars: Array<[string, number, string]> = [
    ["Open", context.summary.open, "#EF4444"],
    ["Progress", context.summary.progress, "#F59E0B"],
    ["Closed", context.summary.closed, "#22C55E"],
    ["Rejected", context.summary.rejected, "#6B7280"],
  ];
  const maxStatus = Math.max(1, ...statusBars.map(([, value]) => value));

  ctx.fillStyle = "#111827";
  ctx.font = '700 28px "Times New Roman"';
  ctx.fillText("Distribusi Status", 56, 378);
  ctx.fillStyle = "#6B7280";
  ctx.font = '400 16px "Times New Roman"';
  ctx.fillText("Dilengkapi data bars agar mudah dibaca langsung di Excel", 56, 406);

  statusBars.forEach((bar, idx) => {
    const y = 448 + idx * 56;
    ctx.fillStyle = "#111827";
    ctx.font = '700 16px "Times New Roman"';
    ctx.fillText(String(bar[0]), 56, y + 18);
    ctx.fillStyle = "#E5E7EB";
    drawRoundedRect(ctx, 220, y - 2, 640, 26, 999);
    ctx.fill();
    ctx.fillStyle = String(bar[2]);
    drawRoundedRect(ctx, 220, y - 2, Math.max(20, (bar[1] / maxStatus) * 640), 26, 999);
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.font = '700 15px "Times New Roman"';
    ctx.fillText(String(bar[1]), 880, y + 18);
  });

  ctx.fillStyle = "#111827";
  ctx.font = '700 28px "Times New Roman"';
  ctx.fillText("Top Kategori", 980, 378);
  ctx.fillStyle = "#6B7280";
  ctx.font = '400 16px "Times New Roman"';
  ctx.fillText("Ringkasan kategori dengan batang horizontal", 980, 406);

  const categories = context.categoryBreakdown.slice(0, 6);
  const maxCategory = Math.max(1, ...categories.map((item) => item.count));
  categories.forEach((item, idx) => {
    const y = 448 + idx * 56;
    const labelLines = wrapText(ctx, item.name, 220).slice(0, 2);
    ctx.fillStyle = "#111827";
    ctx.font = '700 15px "Times New Roman"';
    labelLines.forEach((line, lineIdx) => {
      ctx.fillText(line, 980, y + 14 + lineIdx * 16);
    });
    ctx.fillStyle = "#E5E7EB";
    drawRoundedRect(ctx, 980, y - 2, 300, 26, 999);
    ctx.fill();
    ctx.fillStyle = idx % 2 === 0 ? "#FF8A3D" : "#3B82F6";
    drawRoundedRect(ctx, 980, y - 2, Math.max(20, (item.count / maxCategory) * 300), 26, 999);
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.font = '700 15px "Times New Roman"';
    ctx.fillText(String(item.count), 1298, y + 18);
  });

  return canvas.toDataURL("image/png");
}

function ellipsize(ctx: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (ctx.measureText(value).width <= maxWidth) return value;
  const ellipsis = "...";
  let end = value.length;
  while (end > 0 && ctx.measureText(`${value.slice(0, end)}${ellipsis}`).width > maxWidth) {
    end -= 1;
  }
  return `${value.slice(0, end)}${ellipsis}`;
}

function drawPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title: string, subtitle: string) {
  drawRoundedRect(ctx, x, y, w, h, 24);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#111827";
  ctx.font = '700 24px "Times New Roman"';
  ctx.fillText(title, x + 24, y + 36);
  ctx.fillStyle = "#6B7280";
  ctx.font = '400 14px Arial';
  ctx.fillText(subtitle, x + 24, y + 58);
}

function drawMetricCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  title: string,
  value: string,
  accent: string,
  subtitle?: string
) {
  drawRoundedRect(ctx, x, y, w, 132, 20);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = accent;
  drawRoundedRect(ctx, x, y, 8, 132, 999);
  ctx.fill();
  ctx.fillStyle = "#6B7280";
  ctx.font = '700 12px Arial';
  ctx.fillText(title.toUpperCase(), x + 22, y + 32);
  ctx.fillStyle = "#111827";
  ctx.font = '700 34px "Times New Roman"';
  ctx.fillText(value, x + 22, y + 78);
  if (subtitle) {
    ctx.fillStyle = "#6B7280";
    ctx.font = '400 12px Arial';
    ctx.fillText(subtitle, x + 22, y + 102);
  }
}

function drawChip(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, tone: "success" | "warning" | "danger" | "neutral") {
  const width = Math.max(76, ctx.measureText(text).width + 24);
  const fill = tone === "success" ? "#DCFCE7" : tone === "warning" ? "#FEF3C7" : tone === "danger" ? "#FEE2E2" : "#E5E7EB";
  const textColor = tone === "success" ? "#166534" : tone === "warning" ? "#A16207" : tone === "danger" ? "#991B1B" : "#374151";
  ctx.fillStyle = fill;
  drawRoundedRect(ctx, x, y - 18, width, 28, 999);
  ctx.fill();
  ctx.fillStyle = textColor;
  ctx.font = '700 11px Arial';
  ctx.fillText(text, x + 12, y + 2);
}

function drawRecentTable(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  subtitle: string,
  rows: ExportContext["rows"]
) {
  const headers = [
    ["Kode", 140],
    ["Area", 220],
    ["Kategori", 200],
    ["PIC", 210],
    ["Status", 110],
  ] as const;
  const rowHeight = 58;
  const visibleRows = rows.slice(0, 7);

  drawRoundedRect(ctx, x, y, w, h, 24);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#111827";
  ctx.font = '700 24px "Times New Roman"';
  ctx.fillText(title, x + 24, y + 36);
  ctx.fillStyle = "#6B7280";
  ctx.font = '400 14px Arial';
  ctx.fillText(subtitle, x + 24, y + 58);

  drawRoundedRect(ctx, x + 14, y + 74, w - 28, 34, 16);
  ctx.fillStyle = "#F9FAFB";
  ctx.fill();

  let cursorX = x + 18;
  ctx.fillStyle = "#6B7280";
  ctx.font = '700 12px Arial';
  headers.forEach(([label, width]) => {
    ctx.fillText(label, cursorX, y + 96);
    cursorX += width;
  });

  visibleRows.forEach((row, index) => {
    const rowY = y + 132 + index * rowHeight;
    if (index % 2 === 0) {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(x + 10, rowY - 20, w - 20, 46);
    }
    ctx.fillStyle = "#111827";
    ctx.font = '700 13px Arial';
    ctx.fillText(ellipsize(ctx, row.code, 130), x + 18, rowY + 4);
    ctx.font = '400 13px Arial';
    ctx.fillText(ellipsize(ctx, row.area, 200), x + 158, rowY + 4);
    ctx.fillText(ellipsize(ctx, row.category, 180), x + 378, rowY + 4);
    ctx.fillText(ellipsize(ctx, row.pic, 190), x + 580, rowY + 4);
    const tone = row.status === "closed" ? "success" : row.status === "progress" ? "warning" : row.status === "rejected" ? "danger" : "neutral";
    drawChip(ctx, x + 782, rowY + 4, row.statusLabel, tone);
  });
}

function drawDistributionPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  title: string,
  subtitle: string,
  items: Array<{ name: string; value: number; tone: string }>
) {
  drawPanel(ctx, x, y, w, 250 + items.length * 48, title, subtitle);
  const maxValue = Math.max(1, ...items.map((item) => item.value));
  items.forEach((item, index) => {
    const rowY = y + 92 + index * 48;
    ctx.fillStyle = "#111827";
    ctx.font = '700 13px Arial';
    ctx.fillText(ellipsize(ctx, item.name, 150), x + 24, rowY + 4);
    ctx.fillStyle = "#E5E7EB";
    drawRoundedRect(ctx, x + 180, rowY - 12, w - 258, 20, 999);
    ctx.fill();
    ctx.fillStyle = item.tone;
    drawRoundedRect(ctx, x + 180, rowY - 12, Math.max(18, ((w - 258) * item.value) / maxValue), 20, 999);
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.font = '700 13px Arial';
    ctx.fillText(String(item.value), x + w - 48, rowY + 4);
  });
}

export async function buildProfessionalJpgBlob(title: string, context: ExportContext) {
  const canvas = ensureCanvas();
  canvas.width = 1800;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context tidak tersedia.");

  ctx.fillStyle = "#F4F5F9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#111827";
  drawRoundedRect(ctx, 40, 36, 1720, 132, 28);
  ctx.fill();
  ctx.fillStyle = "#FBBF24";
  drawRoundedRect(ctx, 40, 160, 1720, 8, 999);
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = '700 46px "Times New Roman"';
  ctx.fillText(title, 76, 92);
  ctx.font = '400 18px Arial';
  ctx.fillText(`SIGAP HSE export snapshot | ${formatDateTime(context.generatedAt)}`, 76, 126);
  ctx.font = '700 12px Arial';
  ctx.fillStyle = "#E5E7EB";
  ctx.fillText(`Filter: Status ${context.filters.status || "Semua"}  |  Area ${context.filters.area || "Semua"}  |  Kategori ${context.filters.category || "Semua"}  |  Perusahaan ${context.filters.company || "Semua"}`, 76, 152);

  drawMetricCard(ctx, 40, 210, 410, "Total", String(context.summary.total), "#FBBF24", "Semua data terpilih");
  drawMetricCard(ctx, 470, 210, 410, "Open", String(context.summary.open), "#EF4444", "Butuh tindak lanjut");
  drawMetricCard(ctx, 900, 210, 410, "Progress", String(context.summary.progress), "#F59E0B", "Sedang diproses");
  drawMetricCard(ctx, 1330, 210, 430, "Closed", `${context.summary.closed} (${context.summary.closedRate}%)`, "#22C55E", "Selesai dan terdokumentasi");

  drawRecentTable(ctx, 40, 376, 1080, 840, "Temuan Terbaru", "Ringkasan baris teratas untuk dibaca cepat", context.rows);

  drawDistributionPanel(
    ctx,
    1160,
    376,
    600,
    "Status Distribusi",
    "Komposisi status pada data terpilih",
    [
      { name: "Open", value: context.summary.open, tone: "#EF4444" },
      { name: "Progress", value: context.summary.progress, tone: "#F59E0B" },
      { name: "Closed", value: context.summary.closed, tone: "#22C55E" },
      { name: "Rejected", value: context.summary.rejected, tone: "#6B7280" },
    ]
  );

  drawDistributionPanel(
    ctx,
    1160,
    664,
    600,
    "Top Kategori",
    "Kategori yang paling sering muncul",
    context.categoryBreakdown.slice(0, 6).map((item, index) => ({
      name: item.name,
      value: item.count,
      tone: index % 2 === 0 ? "#FBBF24" : "#111827",
    }))
  );

  ctx.fillStyle = "#6B7280";
  ctx.font = '400 12px Arial';
  ctx.fillText("Data source: export terfilter. Tampilan dirancang minimalis, profesional, dan siap presentasi.", 40, 1248);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (!value) reject(new Error("Gagal membuat JPG."));
      else resolve(value);
    }, "image/jpeg", 0.95);
  });
  return blob;
}

function setSheetBaseStyle(sheet: Worksheet) {
  sheet.properties.defaultRowHeight = 18;
  sheet.views = [{ state: "frozen", ySplit: 4 }];
  sheet.pageSetup = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.35,
      right: 0.35,
      top: 0.45,
      bottom: 0.45,
      header: 0.2,
      footer: 0.2,
    },
  };
  sheet.properties.defaultColWidth = 16;
  sheet.getColumn(1).width = 6;
}

function applyStandardFont(cell: Cell, bold = false, color = "FF111827", size = 11) {
  cell.font = {
    name: "Times New Roman",
    size,
    bold,
    color: { argb: color },
  };
  cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  cell.border = {
    top: { style: "thin", color: { argb: "FFE5E7EB" } },
    left: { style: "thin", color: { argb: "FFE5E7EB" } },
    bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
    right: { style: "thin", color: { argb: "FFE5E7EB" } },
  };
}

function setColumnAutoWidths(sheet: Worksheet, columns: ExportColumn[], rows: FindingExportRow[], startRow = 1) {
  columns.forEach((column, index) => {
    const col = sheet.getColumn(index + 1);
    const values = [
      column.header,
      ...rows.map((row) => {
        const value = column.accessor(row);
        if (value instanceof Date) return formatDateTime(value.toISOString());
        return String(value ?? "");
      }),
    ];
    const maxText = values.reduce((max, value) => Math.max(max, String(value).length), 0);
    col.width = Math.min(Math.max(column.width, maxText + 2), 34);
    col.alignment = { vertical: "middle", horizontal: column.alignment || (column.type === "number" ? "center" : "left"), wrapText: true };
  });

  for (let rowNumber = startRow; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    let lines = 1;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      applyStandardFont(cell, rowNumber <= startRow, rowNumber <= startRow ? "FFFFFFFF" : "FF111827", rowNumber <= startRow ? 12 : 11);
      const columnWidth = sheet.getColumn(colNumber).width || 16;
      const text = String(cell.value instanceof Date ? formatDateTime(cell.value.toISOString()) : cell.text || cell.value || "");
      const estimate = Math.ceil(text.length / Math.max(8, Math.floor(columnWidth * 1.25)));
      lines = Math.max(lines, estimate);
      if (typeof cell.value === "number") {
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      }
    });
    if (rowNumber > startRow) {
      row.height = Math.min(Math.max(18, lines * 16), 64);
    }
  }
}

function addStatusConditionalFormatting(sheet: Worksheet, statusColumnLetter: string, startRow: number, endRow: number) {
  const range = `${statusColumnLetter}${startRow}:${statusColumnLetter}${endRow}`;
  const rules: ContainsTextRuleType[] = [
    {
      type: "containsText",
      operator: "containsText",
      text: "open",
      priority: 1,
      style: {
        font: { color: { argb: "FFB91C1C" }, bold: true },
        fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFFEE2E2" } },
      },
    },
    {
      type: "containsText",
      operator: "containsText",
      text: "progress",
      priority: 2,
      style: {
        font: { color: { argb: "FFB45309" }, bold: true },
        fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFFEF3C7" } },
      },
    },
    {
      type: "containsText",
      operator: "containsText",
      text: "closed",
      priority: 3,
      style: {
        font: { color: { argb: "FF166534" }, bold: true },
        fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFDCFCE7" } },
      },
    },
    {
      type: "containsText",
      operator: "containsText",
      text: "rejected",
      priority: 4,
      style: {
        font: { color: { argb: "FF991B1B" }, bold: true },
        fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFFEE2E2" } },
      },
    },
  ];
  sheet.addConditionalFormatting({
    ref: range,
    rules,
  } satisfies ConditionalFormattingOptions);
}

export async function buildProfessionalXlsxBlob(context: ExportContext) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SIGAP HSE";
  workbook.lastModifiedBy = "SIGAP HSE";
  workbook.created = new Date(context.generatedAt);
  workbook.modified = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  workbook.properties.date1904 = false;
  workbook.views = [{ x: 0, y: 0, width: 1200, height: 800, activeTab: 0, firstSheet: 0, visibility: "visible" }];

  const summarySheet = workbook.addWorksheet("Ringkasan", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });
  const dataSheet = workbook.addWorksheet("Data Temuan", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  const maxColumns = 16;
  summarySheet.columns = Array.from({ length: maxColumns }, () => ({ width: 12 }));
  dataSheet.columns = FINDING_EXPORT_COLUMNS.map((column) => ({ width: column.width }));

  summarySheet.mergeCells("A1:P1");
  summarySheet.mergeCells("A2:P2");
  summarySheet.mergeCells("A3:P3");
  summarySheet.getCell("A1").value = context.title;
  summarySheet.getCell("A2").value = `Ringkasan export | ${formatDateTime(context.generatedAt)} | Status: ${context.filters.status || "Semua"} | Area: ${context.filters.area || "Semua"} | Kategori: ${context.filters.category || "Semua"} | Perusahaan: ${context.filters.company || "Semua"}`;
  summarySheet.getCell("A3").value = `Tanggal: ${context.filters.dateFrom || "-"} s/d ${context.filters.dateTo || "-"} | Total data: ${context.summary.total}`;

  [summarySheet.getCell("A1"), summarySheet.getCell("A2"), summarySheet.getCell("A3")].forEach((cell, idx) => {
    cell.font = {
      name: "Times New Roman",
      size: idx === 0 ? 18 : idx === 1 ? 11 : 11,
      bold: idx === 0,
      color: { argb: idx === 0 ? "FFFFFFFF" : "FF111827" },
    };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  });
  summarySheet.getRow(1).height = 28;
  summarySheet.getRow(2).height = 40;
  summarySheet.getRow(3).height = 24;
  summarySheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" },
  };
  summarySheet.getCell("A2").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF7ED" },
  };
  summarySheet.getCell("A3").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFEDD5" },
  };

  const cardSpecs = [
    ["A5:D7", "Total Temuan", String(context.summary.total), "FF3B82F6"],
    ["E5:H7", "Open", String(context.summary.open), "FFEF4444"],
    ["I5:L7", "Progress", String(context.summary.progress), "FFFBBF24"],
    ["M5:P7", "Closed", `${context.summary.closed} (${context.summary.closedRate}%)`, "FF22C55E"],
  ];

  cardSpecs.forEach(([range, label, value, accent]) => {
    summarySheet.mergeCells(range);
    const startAddress = range.split(":")[0];
    const cell = summarySheet.getCell(startAddress);
    cell.value = `${label}\n${value}`;
    cell.font = {
      name: "Times New Roman",
      size: 12,
      bold: true,
      color: { argb: "FF111827" },
    };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFFFF" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FFE5E7EB" } },
      left: { style: "thin", color: { argb: "FFE5E7EB" } },
      bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      right: { style: "thin", color: { argb: "FFE5E7EB" } },
    };
    const startCell = summarySheet.getCell(startAddress);
    const startCol = Number(startCell.col);
    const row = summarySheet.getRow(Number(startCell.row));
    row.height = 64;
    for (let col = startCol; col <= startCol + 3; col += 1) {
      summarySheet.getColumn(col).width = 12;
    }
    summarySheet.getCell(startAddress).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFFFF" },
    };
    summarySheet.getCell(startAddress).border = {
      left: { style: "thin", color: { argb: accent } },
      top: { style: "thin", color: { argb: accent } },
      right: { style: "thin", color: { argb: accent } },
      bottom: { style: "thin", color: { argb: accent } },
    };
  });

  summarySheet.getCell("A9").value = "Distribusi Status";
  summarySheet.getCell("I9").value = "Top Kategori";
  summarySheet.getCell("A9").font = { name: "Times New Roman", size: 14, bold: true };
  summarySheet.getCell("I9").font = { name: "Times New Roman", size: 14, bold: true };

  summarySheet.addTable({
    name: "StatusSummary",
    ref: "A10",
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: [
      { name: "Status", filterButton: false },
      { name: "Jumlah", filterButton: false },
      { name: "Persentase", filterButton: false },
    ],
    rows: [
      ["Open", context.summary.open, context.summary.total ? `${((context.summary.open / context.summary.total) * 100).toFixed(1)}%` : "0.0%"],
      ["Progress", context.summary.progress, context.summary.total ? `${((context.summary.progress / context.summary.total) * 100).toFixed(1)}%` : "0.0%"],
      ["Closed", context.summary.closed, context.summary.total ? `${((context.summary.closed / context.summary.total) * 100).toFixed(1)}%` : "0.0%"],
      ["Rejected", context.summary.rejected, context.summary.total ? `${((context.summary.rejected / context.summary.total) * 100).toFixed(1)}%` : "0.0%"],
    ],
  });

  summarySheet.addTable({
    name: "CategorySummary",
    ref: "I10",
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: [
      { name: "Kategori", filterButton: false },
      { name: "Jumlah", filterButton: false },
    ],
    rows: context.categoryBreakdown.map((item) => [item.name, item.count]),
  });

  summarySheet.addConditionalFormatting({
    ref: "B11:B14",
    rules: [
      {
        type: "dataBar",
        gradient: true,
        cfvo: [{ type: "min" }, { type: "max" }],
        priority: 1,
        color: "FF3B82F6",
      } as unknown as ConditionalFormattingRule,
    ],
  } satisfies ConditionalFormattingOptions);
  summarySheet.addConditionalFormatting({
    ref: "J11:J18",
    rules: [
      {
        type: "dataBar",
        gradient: true,
        cfvo: [{ type: "min" }, { type: "max" }],
        priority: 1,
        color: "FFFF8A3D",
      } as unknown as ConditionalFormattingRule,
    ],
  } satisfies ConditionalFormattingOptions);

  const chartImage = createSummaryChartDataUrl(context);
  const imageId = workbook.addImage({ base64: chartImage, extension: "png" });
  summarySheet.addImage(imageId, "A16:P37");

  summarySheet.getCell("A39").value = "Catatan: sheet ini berisi ringkasan visual. Detail lengkap ada di sheet Data Temuan.";
  summarySheet.getCell("A39").font = { name: "Times New Roman", size: 10, italic: true, color: { argb: "FF6B7280" } };

  dataSheet.mergeCells("A1:P1");
  dataSheet.mergeCells("A2:P2");
  dataSheet.getCell("A1").value = context.title;
  dataSheet.getCell("A2").value = `Data detail export | ${formatDateTime(context.generatedAt)} | Total row: ${context.rows.length}`;
  dataSheet.getCell("A1").font = { name: "Times New Roman", size: 18, bold: true, color: { argb: "FFFFFFFF" } };
  dataSheet.getCell("A2").font = { name: "Times New Roman", size: 11, color: { argb: "FF111827" } };
  dataSheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
  dataSheet.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF7ED" } };
  dataSheet.getRow(1).height = 28;
  dataSheet.getRow(2).height = 22;

  const tableRef = `A4:P${Math.max(4, context.rows.length + 4)}`;
  dataSheet.addTable({
    name: "FindingData",
    ref: "A4",
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: FINDING_EXPORT_COLUMNS.map((column) => ({ name: column.header, filterButton: true })),
    rows: getFindingExportMatrix(context.rows),
  });

  dataSheet.getRow(4).height = 24;
  dataSheet.autoFilter = tableRef;
  dataSheet.views = [{ state: "frozen", ySplit: 4 }];

  if (context.rows.length > 0) {
    const dataStartRow = 5;
    const dataEndRow = context.rows.length + 4;
    const statusColumnLetter = "J";
    addStatusConditionalFormatting(dataSheet, statusColumnLetter, dataStartRow, dataEndRow);
    dataSheet.addConditionalFormatting({
      ref: `M${dataStartRow}:N${dataEndRow}`,
      rules: [
        {
          type: "dataBar",
          gradient: true,
          cfvo: [{ type: "min" }, { type: "max" }],
          priority: 1,
          color: "FF22C55E",
        } as unknown as ConditionalFormattingRule,
      ],
    } satisfies ConditionalFormattingOptions);
  }

  setSheetBaseStyle(summarySheet);
  setSheetBaseStyle(dataSheet);

  summarySheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      if (rowNumber <= 3) return;
      if (!cell.value) return;
      if (!cell.font) {
        cell.font = { name: "Times New Roman", size: 11, color: { argb: "FF111827" } };
      }
      cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    });
  });
  dataSheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      if (rowNumber < 4) return;
      if (rowNumber === 4) {
        cell.font = { name: "Times New Roman", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        return;
      }
      applyStandardFont(cell, false, "FF111827", 11);
    });
  });

  setColumnAutoWidths(dataSheet, FINDING_EXPORT_COLUMNS, context.rows, 4);
  dataSheet.getColumn(10).width = 16;
  dataSheet.getColumn(15).width = 30;
  dataSheet.getColumn(16).width = 30;

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
