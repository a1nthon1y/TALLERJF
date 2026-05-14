/**
 * Utilidades de exportación de reportes a Excel y PDF.
 *
 * Cualquier endpoint de reporte puede usar `sendReport(res, opts)` para
 * devolver el mismo dataset en JSON / XLSX / PDF según el query param
 * `?formato=`. Esto garantiza que la pantalla, el Excel y el PDF se
 * derivan de la misma fuente de verdad (los mismos filtros, las mismas
 * filas, los mismos totales).
 *
 * Uso típico:
 *
 *   sendReport(res, {
 *     formato:  req.query.formato,           // 'json' (default) | 'xlsx' | 'pdf'
 *     titulo:   "Mantenimientos del período",
 *     subtitulo:"Del 01/01/2026 al 31/03/2026",
 *     filtros:  { Estado: "TODOS", Tipo: "Preventivo" },
 *     columnas: [
 *       { key: "codigo",   label: "Código",  width: 14 },
 *       { key: "unidad",   label: "Unidad",  width: 16 },
 *       { key: "costo",    label: "Costo",   width: 14, type: "currency" },
 *     ],
 *     rows:     resultadosDeLaQuery,
 *     totales:  { costo: 12500.50 },         // opcional
 *     filename: "mantenimientos-2026-Q1",    // sin extensión
 *   });
 */
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

const BRAND = {
  name: "ExpresoJF",
  subtitle: "Sistema de Gestión de Taller",
  primaryHex: "1F2937",   // gris oscuro tipo header
  accentHex:  "2563EB",   // azul para acentos
};

// ─── Formateadores compartidos ──────────────────────────────────────────────
const fmtCurrency = (n) =>
  Number.isFinite(Number(n))
    ? `S/ ${Number(n).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";

const fmtNumber = (n) =>
  Number.isFinite(Number(n))
    ? Number(n).toLocaleString("es-PE")
    : "—";

const fmtDate = (d) => {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const fmtCell = (value, type) => {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "currency") return fmtCurrency(value);
  if (type === "number")   return fmtNumber(value);
  if (type === "date")     return fmtDate(value);
  return String(value);
};

const todayStamp = () => {
  const d = new Date();
  return d.toLocaleString("es-PE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

// ─── Generador Excel ────────────────────────────────────────────────────────
async function buildXlsx({ titulo, subtitulo, filtros, columnas, rows, totales }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = BRAND.name;
  wb.created = new Date();

  const ws = wb.addWorksheet("Reporte", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });

  // Cabecera de marca
  ws.mergeCells(1, 1, 1, columnas.length);
  ws.getCell(1, 1).value = BRAND.name;
  ws.getCell(1, 1).font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  ws.getCell(1, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.primaryHex}` } };
  ws.getCell(1, 1).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(1).height = 26;

  // Título del reporte
  ws.mergeCells(2, 1, 2, columnas.length);
  ws.getCell(2, 1).value = titulo;
  ws.getCell(2, 1).font = { bold: true, size: 13, color: { argb: `FF${BRAND.primaryHex}` } };
  ws.getRow(2).height = 22;

  let cursor = 3;

  if (subtitulo) {
    ws.mergeCells(cursor, 1, cursor, columnas.length);
    ws.getCell(cursor, 1).value = subtitulo;
    ws.getCell(cursor, 1).font = { italic: true, color: { argb: "FF6B7280" } };
    cursor++;
  }

  if (filtros && Object.keys(filtros).length > 0) {
    const filtrosTexto = Object.entries(filtros)
      .map(([k, v]) => `${k}: ${v ?? "—"}`)
      .join("   ·   ");
    ws.mergeCells(cursor, 1, cursor, columnas.length);
    ws.getCell(cursor, 1).value = `Filtros aplicados:  ${filtrosTexto}`;
    ws.getCell(cursor, 1).font = { size: 10, color: { argb: "FF6B7280" } };
    cursor++;
  }

  ws.mergeCells(cursor, 1, cursor, columnas.length);
  ws.getCell(cursor, 1).value = `Generado el ${todayStamp()}`;
  ws.getCell(cursor, 1).font = { size: 9, color: { argb: "FF9CA3AF" } };
  cursor += 2;

  // Encabezados de tabla
  const headerRow = ws.getRow(cursor);
  columnas.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.label;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.accentHex}` } };
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    cell.border = { bottom: { style: "thin", color: { argb: "FFE5E7EB" } } };
  });
  headerRow.height = 22;
  cursor++;

  // Anchos
  columnas.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.width || 16;
  });

  // Filas de datos
  rows.forEach((r) => {
    const row = ws.getRow(cursor);
    columnas.forEach((c, i) => {
      const raw = r[c.key];
      const cell = row.getCell(i + 1);
      if (c.type === "currency") {
        cell.value = Number(raw) || 0;
        cell.numFmt = '"S/ "#,##0.00';
      } else if (c.type === "number") {
        cell.value = Number(raw) || 0;
        cell.numFmt = "#,##0";
      } else if (c.type === "date") {
        const d = raw ? new Date(raw) : null;
        cell.value = d && !Number.isNaN(d.getTime()) ? d : null;
        cell.numFmt = "dd/mm/yyyy";
      } else {
        cell.value = raw ?? "";
      }
      cell.alignment = { vertical: "middle", indent: 1 };
    });
    cursor++;
  });

  // Fila de totales (opcional)
  if (totales) {
    const totalRow = ws.getRow(cursor);
    let labelPuesto = false;
    columnas.forEach((c, i) => {
      const cell = totalRow.getCell(i + 1);
      if (c.key in totales) {
        const v = totales[c.key];
        if (c.type === "currency") {
          cell.value = Number(v) || 0;
          cell.numFmt = '"S/ "#,##0.00';
        } else if (c.type === "number") {
          cell.value = Number(v) || 0;
          cell.numFmt = "#,##0";
        } else {
          cell.value = v;
        }
        cell.font = { bold: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
      } else if (!labelPuesto) {
        cell.value = "TOTAL";
        cell.font = { bold: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
        cell.alignment = { vertical: "middle", indent: 1 };
        labelPuesto = true;
      } else {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
      }
    });
    totalRow.height = 22;
  }

  return wb.xlsx.writeBuffer();
}

// ─── Generador PDF ──────────────────────────────────────────────────────────
function buildPdf({ titulo, subtitulo, filtros, columnas, rows, totales }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36 });
    const buffers = [];
    doc.on("data", (b) => buffers.push(b));
    doc.on("end",  () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // ── Banda de marca ───────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 50).fill(`#${BRAND.primaryHex}`);
    doc.fillColor("white").font("Helvetica-Bold").fontSize(16)
       .text(BRAND.name, doc.page.margins.left, 16);
    doc.font("Helvetica").fontSize(9).fillColor("#D1D5DB")
       .text(BRAND.subtitle, doc.page.margins.left, 34);
    doc.fillColor("#D1D5DB").fontSize(9)
       .text(`Generado: ${todayStamp()}`, 0, 20, { align: "right", width: doc.page.width - doc.page.margins.right });

    doc.moveDown(2.5);
    doc.fillColor(`#${BRAND.primaryHex}`).font("Helvetica-Bold").fontSize(15).text(titulo);
    if (subtitulo) doc.fillColor("#6B7280").font("Helvetica").fontSize(10).text(subtitulo);
    if (filtros && Object.keys(filtros).length > 0) {
      const txt = Object.entries(filtros).map(([k, v]) => `${k}: ${v ?? "—"}`).join("   ·   ");
      doc.fillColor("#6B7280").fontSize(9).text(txt, { width: pageWidth });
    }
    doc.moveDown(0.8);

    // ── Tabla ────────────────────────────────────────────────────────────
    // Calcula proporciones de ancho usando el campo width (caracteres) como peso
    const totalW = columnas.reduce((s, c) => s + (c.width || 16), 0);
    const colWidths = columnas.map((c) => Math.floor(((c.width || 16) / totalW) * pageWidth));

    const drawHeader = () => {
      const y = doc.y;
      doc.rect(doc.page.margins.left, y, pageWidth, 20).fill(`#${BRAND.accentHex}`);
      doc.fillColor("white").font("Helvetica-Bold").fontSize(9);
      let x = doc.page.margins.left;
      columnas.forEach((c, i) => {
        doc.text(c.label, x + 4, y + 6, { width: colWidths[i] - 8, lineBreak: false });
        x += colWidths[i];
      });
      doc.moveDown(1.2);
    };

    drawHeader();

    doc.font("Helvetica").fontSize(8.5).fillColor("#111827");
    rows.forEach((r, idx) => {
      const rowH = 18;
      // Salto de página
      if (doc.y + rowH > doc.page.height - doc.page.margins.bottom - 40) {
        doc.addPage({ size: "A4", layout: "landscape", margin: 36 });
        drawHeader();
        doc.font("Helvetica").fontSize(8.5).fillColor("#111827");
      }
      const y = doc.y;
      // Stripes
      if (idx % 2 === 0) {
        doc.rect(doc.page.margins.left, y - 2, pageWidth, rowH).fill("#F9FAFB");
        doc.fillColor("#111827");
      }
      let x = doc.page.margins.left;
      columnas.forEach((c, i) => {
        const txt = fmtCell(r[c.key], c.type);
        doc.text(txt, x + 4, y + 3, { width: colWidths[i] - 8, lineBreak: false, ellipsis: true });
        x += colWidths[i];
      });
      doc.moveDown(0.95);
    });

    // ── Totales ─────────────────────────────────────────────────────────
    if (totales) {
      doc.moveDown(0.3);
      const y = doc.y;
      doc.rect(doc.page.margins.left, y, pageWidth, 22).fill("#F3F4F6");
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#111827");
      let x = doc.page.margins.left;
      let labelPuesto = false;
      columnas.forEach((c, i) => {
        if (c.key in totales) {
          doc.text(fmtCell(totales[c.key], c.type), x + 4, y + 6, { width: colWidths[i] - 8, lineBreak: false });
        } else if (!labelPuesto) {
          doc.text("TOTAL", x + 4, y + 6, { width: colWidths[i] - 8, lineBreak: false });
          labelPuesto = true;
        }
        x += colWidths[i];
      });
    }

    // ── Pie de página con paginación ────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.fillColor("#9CA3AF").font("Helvetica").fontSize(8)
        .text(
          `Página ${i + 1} de ${range.count}   ·   ${BRAND.name} — ${BRAND.subtitle}`,
          doc.page.margins.left,
          doc.page.height - 28,
          { align: "center", width: pageWidth }
        );
    }

    doc.end();
  });
}

// ─── Función principal ──────────────────────────────────────────────────────
async function sendReport(res, opts) {
  const formato = String(opts.formato || "json").toLowerCase();
  const filename = (opts.filename || "reporte").replace(/[^a-z0-9-_]/gi, "_");

  try {
    if (formato === "xlsx") {
      const buf = await buildXlsx(opts);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
      return res.end(Buffer.from(buf));
    }

    if (formato === "pdf") {
      const buf = await buildPdf(opts);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);
      return res.end(buf);
    }

    // JSON por defecto: incluye también los metadatos para que el frontend
    // pueda mostrar el mismo título/filtros/totales que verán en el archivo.
    return res.json({
      titulo:    opts.titulo,
      subtitulo: opts.subtitulo || null,
      filtros:   opts.filtros   || null,
      columnas:  opts.columnas,
      rows:      opts.rows,
      totales:   opts.totales   || null,
      total_filas: opts.rows.length,
    });
  } catch (err) {
    console.error("Error generando reporte:", err);
    return res.status(500).json({ message: "Error al generar el reporte." });
  }
}

module.exports = { sendReport, fmtCurrency, fmtNumber, fmtDate };
