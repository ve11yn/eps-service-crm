import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type QuotePdfItem = {
  lineNo: number;
  title: string;
  description?: string | null;
  quantity: number;
  unitLabel?: string | null;
  unitPrice: number;
  totalPrice: number;
  decisionStatus: string;
  decisionNotes?: string | null;
};

export type QuotePdfData = {
  documentTitle?: string;
  quoteNumber: string;
  versionNumber: number;
  status: string;
  currencyCode: string;
  createdAt: string;
  validUntil?: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  propertyAddress?: string | null;
  notes?: string | null;
  items: QuotePdfItem[];
  subtotalAmount: number;
  discountAmount: number;
  adjustmentLabel?: string;
  adjustmentAmount?: number;
  totalAmount: number;
};

const A4: [number, number] = [595.28, 841.89];
const margin = 44;
const ink = rgb(0.08, 0.09, 0.1);
const muted = rgb(0.42, 0.44, 0.46);
const line = rgb(0.87, 0.87, 0.87);
const orange = rgb(0.95, 0.48, 0.08);

function money(value: number, currency: string) {
  return `${currency} ${Number(value).toFixed(2)}`;
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-SG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Singapore",
      }).format(date);
}

function wrapText(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r/g, "").split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let current = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${current} ${word}`;
      if (font.widthOfTextAtSize(candidate, size) <= width) current = candidate;
      else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }
  return lines;
}

function drawLines(page: PDFPage, lines: string[], input: { x: number; y: number; font: PDFFont; size: number; color?: ReturnType<typeof rgb>; lineHeight?: number }) {
  const lineHeight = input.lineHeight ?? input.size * 1.35;
  lines.forEach((text, index) => page.drawText(text, {
    x: input.x,
    y: input.y - index * lineHeight,
    font: input.font,
    size: input.size,
    color: input.color ?? ink,
  }));
  return input.y - lines.length * lineHeight;
}

function drawRight(page: PDFPage, text: string, right: number, y: number, font: PDFFont, size: number, color = ink) {
  page.drawText(text, { x: right - font.widthOfTextAtSize(text, size), y, font, size, color });
}

export async function generateQuotePdf(data: QuotePdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const title = data.documentTitle ?? "QUOTATION";
  const displayTitle = title.toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
  let page: PDFPage;
  let pageNumber = 0;
  let y = 0;

  const addPage = () => {
    page = pdf.addPage(A4);
    pageNumber += 1;
    const { width, height } = page.getSize();
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
    page.drawText(displayTitle, { x: margin, y: height - 58, font: regular, size: 24, color: ink });
    page.drawText(`${data.quoteNumber}${title === "QUOTATION" ? `  |  Version ${data.versionNumber}` : ""}`, {
      x: margin,
      y: height - 78,
      font: regular,
      size: 8,
      color: muted,
    });
    drawRight(page, `Date: ${dateLabel(data.createdAt)}`, width - margin, height - 58, regular, 8, muted);
    if (data.validUntil) drawRight(page, `Valid until: ${dateLabel(data.validUntil)}`, width - margin, height - 73, regular, 8, muted);
    page.drawLine({ start: { x: margin, y: height - 94 }, end: { x: width - margin, y: height - 94 }, thickness: 1.2, color: orange });
    page.drawLine({ start: { x: margin, y: 35 }, end: { x: width - margin, y: 35 }, thickness: 0.5, color: line });
    drawRight(page, `Page ${pageNumber}`, width - margin, 22, regular, 7, muted);
    y = height - 120;
  };

  addPage();
  const pageWidth = page!.getWidth();

  page!.drawText("CUSTOMER", { x: margin, y, font: bold, size: 7, color: muted });
  y -= 19;
  page!.drawText(data.customerName || "Customer", { x: margin, y, font: bold, size: 11, color: ink });
  y -= 15;
  const customerLines = [data.customerPhone, data.customerEmail, data.propertyAddress].filter(Boolean) as string[];
  if (customerLines.length) {
    y = drawLines(page!, customerLines.flatMap((value) => wrapText(value, regular, 8, pageWidth - margin * 2)), {
      x: margin,
      y,
      font: regular,
      size: 8,
      color: muted,
      lineHeight: 11,
    });
  }
  y -= 16;

  const columns = { item: margin, qty: 355, unit: 405, total: pageWidth - margin };
  const drawTableHeader = () => {
    page!.drawText("Description", { x: columns.item, y, font: regular, size: 8, color: muted });
    page!.drawText("Qty", { x: columns.qty, y, font: regular, size: 8, color: muted });
    page!.drawText("Unit price", { x: columns.unit, y, font: regular, size: 8, color: muted });
    drawRight(page!, "Amount", columns.total, y, regular, 8, muted);
    y -= 10;
    page!.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: orange });
    y -= 13;
  };

  drawTableHeader();
  for (const item of [...data.items].sort((left, right) => left.lineNo - right.lineNo)) {
    const titleLines = wrapText(`${item.lineNo}. ${item.title}`, bold, 8.5, 286);
    const details = [
      item.description,
      !["proposed", "included", "approved"].includes(item.decisionStatus) ? `Status: ${item.decisionStatus}` : null,
      item.decisionNotes,
    ].filter(Boolean).join(" - ");
    const detailLines = details ? wrapText(details, regular, 7.5, 286) : [];
    const rowHeight = Math.max(37, 12 + titleLines.length * 11 + detailLines.length * 9);
    if (y - rowHeight < 70) {
      addPage();
      drawTableHeader();
    }
    drawLines(page!, titleLines, { x: columns.item, y: y - 2, font: bold, size: 8.5, lineHeight: 11 });
    if (detailLines.length) drawLines(page!, detailLines, { x: columns.item, y: y - 4 - titleLines.length * 11, font: regular, size: 7.5, color: muted, lineHeight: 9 });
    page!.drawText(`${item.quantity} ${item.unitLabel ?? "item"}`, { x: columns.qty, y: y - 2, font: regular, size: 8, color: ink });
    page!.drawText(money(item.unitPrice, data.currencyCode), { x: columns.unit, y: y - 2, font: regular, size: 8, color: ink });
    drawRight(page!, money(item.totalPrice, data.currencyCode), columns.total, y - 2, regular, 8, ink);
    y -= rowHeight;
    page!.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.45, color: line });
    y -= 10;
  }

  if (y < 165) addPage();
  const totalsLabelX = 365;
  const totalRight = pageWidth - margin;
  const drawTotal = (label: string, value: number, emphasized = false) => {
    const font = emphasized ? bold : regular;
    const size = emphasized ? 10 : 8;
    page!.drawText(label, { x: totalsLabelX, y, font, size, color: emphasized ? ink : muted });
    drawRight(page!, money(value, data.currencyCode), totalRight, y, font, size, emphasized ? ink : muted);
    y -= emphasized ? 22 : 17;
  };
  drawTotal("Subtotal", data.subtotalAmount);
  drawTotal(data.adjustmentLabel ?? "Discount", data.adjustmentAmount ?? data.discountAmount);
  page!.drawLine({ start: { x: totalsLabelX, y: y + 8 }, end: { x: totalRight, y: y + 8 }, thickness: 1, color: orange });
  drawTotal("Total", data.totalAmount, true);

  if (data.notes) {
    const noteLines = wrapText(data.notes, regular, 8, pageWidth - margin * 2);
    if (y - noteLines.length * 11 < 60) addPage();
    y -= 8;
    page!.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: orange });
    y -= 18;
    page!.drawText("NOTES", { x: margin, y, font: bold, size: 7, color: muted });
    y -= 15;
    drawLines(page!, noteLines, { x: margin, y, font: regular, size: 8, color: ink, lineHeight: 11 });
  }

  pdf.setTitle(`${data.quoteNumber}${title === "QUOTATION" ? ` v${data.versionNumber}` : ""}`);
  pdf.setSubject(title === "INVOICE" ? "Customer invoice" : "Customer quotation");
  return pdf.save();
}
