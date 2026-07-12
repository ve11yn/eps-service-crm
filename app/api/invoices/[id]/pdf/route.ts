import { NextResponse } from "next/server";
import { getInvoiceDetail } from "@/backend/services/finance/invoice-operations";
import { generateQuotePdf } from "@/backend/services/quotes/generate-quote-pdf";
import { requireApiSession } from "@/lib/auth/api";
type Ctx = { params: Promise<{ id: string }> };
function first<T>(value: T | T[] | null | undefined): T | null { return Array.isArray(value) ? value[0] ?? null : value ?? null; }
export async function GET(_request: Request, ctx: Ctx) {
  const auth = await requireApiSession(["owner", "admin"]); if (!auth.ok) return auth.response;
  const { id } = await ctx.params; const invoice = await getInvoiceDetail(id);
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  const project = first(invoice.projects); const contact = first(project?.contacts); const property = first(project?.properties);
  const items = Array.isArray(invoice.invoice_items) ? invoice.invoice_items : [];
  const bytes = await generateQuotePdf({
    documentTitle: "INVOICE", quoteNumber: invoice.invoice_number, versionNumber: 1, status: invoice.status_code,
    currencyCode: invoice.currency_code, createdAt: invoice.issued_at ?? invoice.created_at,
    customerName: contact?.full_name ?? project?.title ?? "Customer", customerPhone: contact?.primary_phone,
    customerEmail: contact?.email, propertyAddress: property ? [property.address_line_1, property.unit_no, property.postal_code].filter(Boolean).join(", ") : null,
    notes: invoice.customer_notes ?? invoice.notes,
    items: items.map((item) => ({ lineNo: item.line_no, title: item.title, description: item.description, quantity: Number(item.quantity), unitLabel: item.unit_label, unitPrice: Number(item.unit_price), totalPrice: Number(item.total_price), decisionStatus: "included" })),
    subtotalAmount: Number(invoice.subtotal_amount), discountAmount: 0,
    adjustmentLabel: "Tax", adjustmentAmount: Number(invoice.tax_amount), totalAmount: Number(invoice.total_amount),
  });
  return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${invoice.invoice_number}.pdf"` } });
}
