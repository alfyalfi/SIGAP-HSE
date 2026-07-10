export function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildCsv(rows: unknown[][]) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

export function xmlEscape(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function utf8Bytes(text: string) {
  return new TextEncoder().encode(text);
}

function writeUint16LE(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeUint32LE(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, true);
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);
  return {
    date: ((year - 1980) << 9) | (month << 5) | day,
    time: (hours << 11) | (minutes << 5) | seconds,
  };
}

type ZipEntry = {
  name: string;
  data: Uint8Array;
  date?: Date;
};

export function buildZip(entries: ZipEntry[]) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = utf8Bytes(entry.name);
    const { date, time } = dosDateTime(entry.date);
    const checksum = crc32(entry.data);

    const local = new Uint8Array(30 + nameBytes.length + entry.data.length);
    const localView = new DataView(local.buffer);
    writeUint32LE(localView, 0, 0x04034b50);
    writeUint16LE(localView, 4, 20);
    writeUint16LE(localView, 6, 0);
    writeUint16LE(localView, 8, 0);
    writeUint16LE(localView, 10, time);
    writeUint16LE(localView, 12, date);
    writeUint32LE(localView, 14, checksum);
    writeUint32LE(localView, 18, entry.data.length);
    writeUint32LE(localView, 22, entry.data.length);
    writeUint16LE(localView, 26, nameBytes.length);
    writeUint16LE(localView, 28, 0);
    local.set(nameBytes, 30);
    local.set(entry.data, 30 + nameBytes.length);
    localParts.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    writeUint32LE(centralView, 0, 0x02014b50);
    writeUint16LE(centralView, 4, 20);
    writeUint16LE(centralView, 6, 20);
    writeUint16LE(centralView, 8, 0);
    writeUint16LE(centralView, 10, 0);
    writeUint16LE(centralView, 12, time);
    writeUint16LE(centralView, 14, date);
    writeUint32LE(centralView, 16, checksum);
    writeUint32LE(centralView, 20, entry.data.length);
    writeUint32LE(centralView, 24, entry.data.length);
    writeUint16LE(centralView, 28, nameBytes.length);
    writeUint16LE(centralView, 30, 0);
    writeUint16LE(centralView, 32, 0);
    writeUint16LE(centralView, 34, 0);
    writeUint16LE(centralView, 36, 0);
    writeUint32LE(centralView, 38, 0);
    writeUint32LE(centralView, 42, offset);
    central.set(nameBytes, 46);
    centralParts.push(central);

    offset += local.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeUint32LE(endView, 0, 0x06054b50);
  writeUint16LE(endView, 4, 0);
  writeUint16LE(endView, 6, 0);
  writeUint16LE(endView, 8, entries.length);
  writeUint16LE(endView, 10, entries.length);
  writeUint32LE(endView, 12, centralSize);
  writeUint32LE(endView, 16, offset);
  writeUint16LE(endView, 20, 0);

  const toArrayBuffer = (part: Uint8Array) =>
    part.buffer.slice(part.byteOffset, part.byteOffset + part.byteLength) as ArrayBuffer;

  const parts: BlobPart[] = [
    ...localParts.map(toArrayBuffer),
    ...centralParts.map(toArrayBuffer),
    toArrayBuffer(end),
  ];
  return new Blob(parts, {
    type: "application/zip",
  });
}

function cellRef(colIndex: number, rowIndex: number) {
  let col = colIndex + 1;
  let name = "";
  while (col > 0) {
    const mod = (col - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    col = Math.floor((col - mod) / 26);
  }
  return `${name}${rowIndex}`;
}

function buildSheetXml(headers: string[], rows: unknown[][]) {
  const allRows = [headers, ...rows];
  const rowsXml = allRows
    .map((row, rowIdx) => {
      const cells = row
        .map((value, colIdx) => {
          const cell = cellRef(colIdx, rowIdx + 1);
          const text = xmlEscape(value ?? "");
          const isNumber = typeof value === "number" && Number.isFinite(value);
          if (isNumber) {
            return `<c r="${cell}"><v>${value}</v></c>`;
          }
          return `<c r="${cell}" t="inlineStr"><is><t>${text}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIdx + 1}">${cells}</row>`;
    })
    .join("");

  const columnCount = Math.max(1, headers.length);
  const sheetData = `<sheetData>${rowsXml}</sheetData>`;
  const dimension = `A1:${cellRef(columnCount - 1, Math.max(1, allRows.length))}`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="${dimension}" />
  <sheetViews>
    <sheetView workbookViewId="0" />
  </sheetViews>
  <sheetFormatPr defaultRowHeight="18" />
  ${sheetData}
  <pageMargins left="0.5" right="0.5" top="0.5" bottom="0.5" header="0.3" footer="0.3" />
</worksheet>`;
}

export function buildXlsxBlob(headers: string[], rows: unknown[][], sheetName = "Laporan") {
  const safeSheetName = sheetName.replace(/[\\/:?*\[\]]/g, " ").slice(0, 31) || "Laporan";
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${xmlEscape(safeSheetName)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

  return buildZip([
    { name: "[Content_Types].xml", data: utf8Bytes(contentTypes) },
    { name: "_rels/.rels", data: utf8Bytes(rels) },
    { name: "xl/workbook.xml", data: utf8Bytes(workbook) },
    { name: "xl/_rels/workbook.xml.rels", data: utf8Bytes(workbookRels) },
    { name: "xl/worksheets/sheet1.xml", data: utf8Bytes(buildSheetXml(headers, rows)) },
  ]);
}

function buildDocParagraph(text: string, style = "Normal") {
  return `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r><w:t>${xmlEscape(text)}</w:t></w:r></w:p>`;
}

function buildDocTable(headers: string[], rows: unknown[][]) {
  const makeCell = (text: unknown, header = false) => {
    const style = header ? "<w:tcPr><w:tcW w:w=\"2400\" w:type=\"dxa\"/></w:tcPr>" : "<w:tcPr><w:tcW w:w=\"2400\" w:type=\"dxa\"/></w:tcPr>";
    return `<w:tc>${style}<w:p><w:r><w:t>${xmlEscape(text)}</w:t></w:r></w:p></w:tc>`;
  };
  const headerRow = `<w:tr>${headers.map((header) => makeCell(header, true)).join("")}</w:tr>`;
  const bodyRows = rows.map((row) => `<w:tr>${headers.map((_, idx) => makeCell(row[idx] ?? "")).join("")}</w:tr>`).join("");
  return `<w:tbl>
    <w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>
      <w:top w:val="single" w:sz="8" w:space="0" w:color="D1D5DB"/>
      <w:left w:val="single" w:sz="8" w:space="0" w:color="D1D5DB"/>
      <w:bottom w:val="single" w:sz="8" w:space="0" w:color="D1D5DB"/>
      <w:right w:val="single" w:sz="8" w:space="0" w:color="D1D5DB"/>
      <w:insideH w:val="single" w:sz="8" w:space="0" w:color="D1D5DB"/>
      <w:insideV w:val="single" w:sz="8" w:space="0" w:color="D1D5DB"/>
    </w:tblBorders></w:tblPr>
    <w:tblGrid>${headers.map(() => '<w:gridCol w:w="2400"/>').join("")}</w:tblGrid>
    ${headerRow}${bodyRows}
  </w:tbl>`;
}

export function buildDocxBlob(title: string, paragraphs: string[], headers: string[], rows: unknown[][]) {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
  <w:body>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>${xmlEscape(title)}</w:t></w:r></w:p>
    ${paragraphs.map((p) => buildDocParagraph(p)).join("")}
    ${headers.length && rows.length ? buildDocTable(headers, rows) : ""}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  return buildZip([
    { name: "[Content_Types].xml", data: utf8Bytes(contentTypes) },
    { name: "_rels/.rels", data: utf8Bytes(rels) },
    { name: "word/document.xml", data: utf8Bytes(documentXml) },
  ]);
}

export function downloadTextFile(content: string, fileName: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  downloadBlobFile(blob, fileName);
}

export function downloadBlobFile(blob: Blob, fileName: string) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const nav = window.navigator as Navigator & { msSaveOrOpenBlob?: (blob: Blob, fileName?: string) => void };
  if (typeof nav.msSaveOrOpenBlob === "function") {
    nav.msSaveOrOpenBlob(blob, fileName);
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

export function slugifyFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
