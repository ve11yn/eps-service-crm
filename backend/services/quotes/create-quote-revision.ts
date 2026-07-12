import "server-only";

import {
  createQuote,
  createQuoteItem,
  getQuoteDetail,
  listQuotesByLeadId,
  updateQuote,
} from "@/backend/repositories";
import { logAuditEvent } from "@/backend/observability/audit";
import { createQuoteValidUntil } from "@/backend/services/quotes/quote-validity";

export async function createQuoteRevision(input: {
  quoteId: string;
  performedByProfileId?: string | null;
}) {
  const source = await getQuoteDetail(input.quoteId);
  if (!source) throw new Error("Quote not found.");
  if (source.status_code === "draft") {
    throw new Error("Edit the current draft instead of creating a revision.");
  }
  if (source.status_code === "approved" || source.project_id) {
    throw new Error("An approved quote cannot be revised.");
  }

  const siblingQuotes = source.lead_id
    ? await listQuotesByLeadId(source.lead_id)
    : [];
  const nextVersion = Math.max(
    source.version_number,
    ...siblingQuotes
      .filter((quote) => quote.quote_number === source.quote_number)
      .map((quote) => quote.version_number),
  ) + 1;

  const revision = await createQuote({
    lead_id: source.lead_id,
    project_id: null,
    quote_number: source.quote_number,
    version_number: nextVersion,
    revision_of_quote_id: source.id,
    status_code: "draft",
    created_by_profile_id: input.performedByProfileId ?? null,
    currency_code: source.currency_code,
    subtotal_amount: source.subtotal_amount,
    discount_amount: source.discount_amount,
    total_amount: source.total_amount,
    notes: source.notes,
    valid_until: await createQuoteValidUntil(),
  });

  const sourceItems = Array.isArray(source.quote_items)
    ? [...source.quote_items].sort((left, right) => left.line_no - right.line_no)
    : [];

  await Promise.all(
    sourceItems.map((item) =>
      createQuoteItem({
        quote_id: revision.id,
        pricing_item_id: item.pricing_item_id,
        line_no: item.line_no,
        title: item.title,
        description: item.description,
        quantity: item.quantity,
        unit_label: item.unit_label,
        unit_price: item.unit_price,
        total_price: item.total_price,
        notes: item.notes,
        decision_status:
          item.decision_status === "rejected" || item.decision_status === "deferred"
            ? item.decision_status
            : "proposed",
        decision_notes: item.decision_notes,
        pricing_match_status: item.pricing_match_status,
        pricing_match_confidence: item.pricing_match_confidence,
        pricing_match_method: item.pricing_match_method,
        pricing_match_notes: item.pricing_match_notes,
      }),
    ),
  );

  if (source.status_code !== "revised") {
    await updateQuote(source.id, { status_code: "revised" });
  }

  await logAuditEvent({
    action: "quotes.create_revision",
    entityType: "quote",
    entityId: revision.id,
    performedByProfileId: input.performedByProfileId ?? null,
    metadata: {
      source_quote_id: source.id,
      quote_number: source.quote_number,
      from_version: source.version_number,
      to_version: nextVersion,
    },
  });

  return getQuoteDetail(revision.id);
}
