import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { getQuoteDetail } from "@/backend/repositories";
import { generateQuotePdf } from "@/backend/services/quotes/generate-quote-pdf";
import { requireApiSession } from "@/lib/auth/api";

type RouteContext = { params: Promise<{ id: string }> };

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiSession(["owner", "admin"]);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const quote = await getQuoteDetail(id);
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    const lead = first(quote.leads);
    const contact = first(lead?.contacts);
    const property = first(lead?.properties);
    const address = property
      ? [property.address_line_1, property.address_line_2, property.unit_no, property.postal_code]
          .filter(Boolean)
          .join(", ")
      : null;
    const items = Array.isArray(quote.quote_items) ? quote.quote_items : [];
    const bytes = await generateQuotePdf({
      quoteNumber: quote.quote_number,
      versionNumber: quote.version_number,
      status: quote.status_code,
      currencyCode: quote.currency_code,
      createdAt: quote.created_at,
      validUntil: quote.valid_until,
      customerName: contact?.full_name ?? lead?.title ?? "Customer",
      customerPhone: contact?.whatsapp_number ?? contact?.primary_phone ?? null,
      customerEmail: contact?.email ?? null,
      propertyAddress: address,
      notes: quote.notes,
      items: items.map((item) => ({
        lineNo: item.line_no,
        title: item.title,
        description: item.description,
        quantity: Number(item.quantity),
        unitLabel: item.unit_label,
        unitPrice: Number(item.unit_price),
        totalPrice: Number(item.total_price),
        decisionStatus: item.decision_status,
        decisionNotes: item.decision_notes,
      })),
      subtotalAmount: Number(quote.subtotal_amount),
      discountAmount: Number(quote.discount_amount),
      totalAmount: Number(quote.total_amount),
    });

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFileName(quote.quote_number)}-v${quote.version_number}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.quotes.pdf",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
