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
const margin = 48;
const blue = rgb(0.08, 0.25, 0.45);
const lightBlue = rgb(0.92, 0.96, 0.99);
const slate = rgb(0.24, 0.29, 0.36);
const muted = rgb(0.43, 0.48, 0.55);
const border = rgb(0.84, 0.87, 0.9);

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

function wrapText(text: string, font: PDFFont, size: number, width: number): string[] {
  const paragraphs = text.replace(/\r/g, "").split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
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

function drawTextLines(
  page: PDFPage,
  lines: string[],
  options: { x: number; y: number; font: PDFFont; size: number; color?: ReturnType<typeof rgb>; lineHeight?: number },
) {
  const lineHeight = options.lineHeight ?? options.size * 1.35;
  lines.forEach((line, index) => {
    page.drawText(line, {
      x: options.x,
      y: options.y - index * lineHeight,
      font: options.font,
      size: options.size,
      color: options.color ?? slate,
    });
  });
  return options.y - lines.length * lineHeight;
}

export async function generateQuotePdf(data: QuotePdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let pageNumber = 0;
  let page: PDFPage;
  let y = 0;

  const addPage = () => {
    page = pdf.addPage(A4);
    pageNumber += 1;
    const { width, height } = page.getSize();

    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
    page.drawRectangle({ x: 0, y: height - 92, width, height: 92, color: blue });
    page.drawText("GAGE'S", { x: margin, y: height - 48, font: bold, size: 22, color: rgb(1, 1, 1) });
    page.drawText("HANDYMAN & CLEANING SERVICE", {
      x: margin,
      y: height - 68,
      font: regular,
      size: 9,
      color: rgb(0.88, 0.93, 0.98),
    });
    const documentTitle = data.documentTitle ?? "QUOTATION";
    page.drawText(documentTitle, {
      x: width - margin - bold.widthOfTextAtSize(documentTitle, 18),
      y: height - 54,
      font: bold,
      size: 18,
      color: rgb(1, 1, 1),
    });

    page.drawText(`Page ${pageNumber}`, {
      x: width - margin - 35,
      y: 24,
      font: regular,
      size: 8,
      color: muted,
    });
    page.drawLine({ start: { x: margin, y: 36 }, end: { x: width - margin, y: 36 }, thickness: 0.5, color: border });
    y = height - 122;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < 54) addPage();
  };

  addPage();
  const { width } = page!.getSize();

  page!.drawText(`${data.quoteNumber} / v${data.versionNumber}`, {
    x: margin,
    y,
    font: bold,
    size: 13,
    color: blue,
  });
  page!.drawText(dateLabel(data.createdAt), {
    x: width - margin - regular.widthOfTextAtSize(dateLabel(data.createdAt), 10),
    y,
    font: regular,
    size: 10,
    color: muted,
  });
  y -= 32;

  page!.drawRectangle({ x: margin, y: y - 94, width: width - margin * 2, height: 94, color: lightBlue });
  page!.drawText("PREPARED FOR", { x: margin + 16, y: y - 20, font: bold, size: 8, color: muted });
  page!.drawText(data.customerName || "Customer", { x: margin + 16, y: y - 40, font: bold, size: 12, color: slate });
  const customerLines = [data.customerPhone, data.customerEmail, data.propertyAddress].filter(Boolean) as string[];
  drawTextLines(page!, customerLines.slice(0, 3), {
    x: margin + 16,
    y: y - 57,
    font: regular,
    size: 9,
    color: muted,
    lineHeight: 12,
  });
  y -= 120;

  const columns = { item: margin, qty: 360, price: 414, total: 490 };
  const drawTableHeader = () => {
    page!.drawRectangle({ x: margin, y: y - 24, width: width - margin * 2, height: 24, color: blue });
    page!.drawText("SCOPE ITEM", { x: columns.item + 8, y: y - 16, font: bold, size: 8, color: rgb(1, 1, 1) });
    page!.drawText("QTY", { x: columns.qty, y: y - 16, font: bold, size: 8, color: rgb(1, 1, 1) });
    page!.drawText("UNIT", { x: columns.price, y: y - 16, font: bold, size: 8, color: rgb(1, 1, 1) });
    page!.drawText("TOTAL", { x: columns.total, y: y - 16, font: bold, size: 8, color: rgb(1, 1, 1) });
    y -= 24;
  };

  drawTableHeader();
  for (const item of [...data.items].sort((a, b) => a.lineNo - b.lineNo)) {
    const titleLines = wrapText(`${item.lineNo}. ${item.title}`, bold, 9, 292);
    const detailText = [item.description, item.decisionStatus !== "proposed" ? `Decision: ${item.decisionStatus}` : null, item.decisionNotes]
      .filter(Boolean)
      .join(" - ");
    const detailLines = detailText ? wrapText(detailText, regular, 8, 292) : [];
    const rowHeight = Math.max(44, 16 + titleLines.length * 12 + detailLines.length * 10);
    ensureSpace(rowHeight + 28);
    if (y > page!.getHeight() - 130) drawTableHeader();

    page!.drawRectangle({ x: margin, y: y - rowHeight, width: width - margin * 2, height: rowHeight, borderColor: border, borderWidth: 0.5 });
    drawTextLines(page!, titleLines, { x: columns.item + 8, y: y - 15, font: bold, size: 9, lineHeight: 12 });
    if (detailLines.length) {
      drawTextLines(page!, detailLines, {
        x: columns.item + 8,
        y: y - 17 - titleLines.length * 12,
        font: regular,
        size: 8,
        color: muted,
        lineHeight: 10,
      });
    }
    page!.drawText(`${item.quantity} ${item.unitLabel ?? "item"}`, { x: columns.qty, y: y - 18, font: regular, size: 8, color: slate });
    page!.drawText(money(item.unitPrice, data.currencyCode), { x: columns.price, y: y - 18, font: regular, size: 8, color: slate });
    page!.drawText(money(item.totalPrice, data.currencyCode), { x: columns.total, y: y - 18, font: bold, size: 8, color: slate });
    y -= rowHeight;
  }

  ensureSpace(120);
  y -= 18;
  const totalsX = 365;
  const totalValueX = width - margin;
  const drawTotal = (label: string, value: number, emphasized = false) => {
    const font = emphasized ? bold : regular;
    const size = emphasized ? 12 : 9;
    page!.drawText(label, { x: totalsX, y, font, size, color: emphasized ? blue : muted });
    const valueText = money(value, data.currencyCode);
    page!.drawText(valueText, {
      x: totalValueX - font.widthOfTextAtSize(valueText, size),
      y,
      font,
      size,
      color: emphasized ? blue : slate,
    });
    y -= emphasized ? 24 : 18;
  };
  drawTotal("Subtotal", data.subtotalAmount);
  drawTotal(data.adjustmentLabel ?? "Discount", data.adjustmentAmount ?? data.discountAmount);
  page!.drawLine({ start: { x: totalsX, y: y + 8 }, end: { x: totalValueX, y: y + 8 }, thickness: 1, color: blue });
  drawTotal("TOTAL", data.totalAmount, true);

  if (data.notes) {
    const noteLines = wrapText(data.notes, regular, 9, width - margin * 2 - 20);
    ensureSpace(38 + noteLines.length * 12);
    page!.drawRectangle({ x: margin, y: y - 18 - noteLines.length * 12, width: width - margin * 2, height: 28 + noteLines.length * 12, color: rgb(0.97, 0.97, 0.97) });
    page!.drawText("NOTES", { x: margin + 10, y: y, font: bold, size: 8, color: muted });
    drawTextLines(page!, noteLines, { x: margin + 10, y: y - 16, font: regular, size: 9, lineHeight: 12 });
  }

  pdf.setTitle(`${data.quoteNumber} v${data.versionNumber}`);
  pdf.setAuthor("Gage's Handyman & Cleaning Service");
  pdf.setSubject("Customer quotation");
  return pdf.save();
}
