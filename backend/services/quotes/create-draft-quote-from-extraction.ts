import "server-only";

import { randomUUID } from "node:crypto";
import {
  createQuote,
  createQuoteItem,
  listQuotesByLeadId,
} from "@/backend/repositories";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { AiLeadExtraction } from "@/types/integration";

function buildQuoteNumber() {
  return `QUOTE-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function ensureDraftQuoteFromExtraction(input: {
  leadId: string;
  createdByProfileId?: string | null;
  extraction: AiLeadExtraction;
}) {
  if (input.extraction.workItems.length === 0) {
    return null;
  }

  const existingQuotes = await listQuotesByLeadId(input.leadId);
  const existingOpenQuote = existingQuotes.find((quote) =>
    ["draft", "sent", "negotiating", "revised", "approved"].includes(
      quote.status_code,
    ),
  );

  if (existingOpenQuote) {
    return existingOpenQuote;
  }

  const quote = await createQuote({
    lead_id: input.leadId,
    quote_number: buildQuoteNumber(),
    version_number: 1,
    status_code: "draft",
    created_by_profile_id: input.createdByProfileId ?? null,
    notes: input.extraction.scopeSummary ?? input.extraction.summary,
    subtotal_amount: 0,
    discount_amount: 0,
    total_amount: 0,
  });

  await Promise.all(
    input.extraction.workItems.map((item, index) =>
      createQuoteItem({
        quote_id: quote.id,
        line_no: index + 1,
        title: item.title || "Work item",
        description: item.description ?? item.actionSummary ?? null,
        quantity: 1,
        unit_label: "item",
        unit_price: 0,
        total_price: 0,
        notes: item.areaName ?? item.itemType ?? null,
      }),
    ),
  );

  const mediaIds = input.extraction.workItems.flatMap((item) =>
    (item.mediaAssets ?? []).map((asset) => asset.id),
  );

  if (mediaIds.length > 0) {
    const supabase = createAdminSupabaseClient();
    await supabase
      .from("media_assets")
      .update({
        lead_id: input.leadId,
        evidence_type: "customer_supplied",
      })
      .in("id", mediaIds);
  }

  return quote;
}
