import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type ExportColumn = {
  header: string;
  key: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportRowsToXlsx(
  rows: Record<string, string | number>[],
  columns: ExportColumn[],
  options: { fileName: string; sheetName: string },
) {
  const data = rows.map((row) => {
    const out: Record<string, string | number> = {};
    for (const col of columns) {
      out[col.header] = row[col.key] ?? "";
    }
    return out;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName);

  const colWidths = columns.map((col) => {
    const headerLen = col.header.length;
    const maxCell = data.reduce((max, row) => {
      const val = String(row[col.header] ?? "");
      return Math.max(max, val.length);
    }, headerLen);
    return { wch: Math.min(Math.max(maxCell + 2, 10), 40) };
  });
  worksheet["!cols"] = colWidths;

  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  }) as number[];
  downloadBlob(
    new Blob([new Uint8Array(buffer)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${slugify(options.fileName) || "export"}.xlsx`,
  );
}

export function exportRowsToPdf(
  rows: Record<string, string | number>[],
  columns: ExportColumn[],
  options: {
    fileName: string;
    title: string;
    subtitle?: string;
  },
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const marginX = 40;

  doc.setFontSize(16);
  doc.setTextColor(15, 118, 110);
  doc.text(options.title, marginX, 36);

  if (options.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(options.subtitle, marginX, 54);
  }

  autoTable(doc, {
    startY: options.subtitle ? 68 : 52,
    head: [columns.map((c) => c.header)],
    body: rows.map((row) => columns.map((c) => String(row[c.key] ?? ""))),
    styles: {
      fontSize: 9,
      cellPadding: 6,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [15, 118, 110],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: marginX, right: marginX },
  });

  doc.save(`${slugify(options.fileName) || "export"}.pdf`);
}
