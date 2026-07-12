import "server-only";

import { randomUUID } from "node:crypto";
import {
  createQuote,
  createQuoteItem,
  getQuoteDetail,
  listQuotesByLeadId,
  updateQuote,
  updateQuoteItem,
} from "@/backend/repositories";
import { matchWorkItemToPricing } from "@/backend/services/pricing/match-work-item-to-pricing";
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
    if (existingOpenQuote.status_code !== "draft") {
      return existingOpenQuote;
    }

    const detail = await getQuoteDetail(existingOpenQuote.id);
    const existingItems = Array.isArray(detail?.quote_items)
      ? [...detail.quote_items].sort((left, right) => left.line_no - right.line_no)
      : [];
    let subtotal = 0;

    await Promise.all(
      existingItems.map(async (quoteItem, index) => {
        if (quoteItem.pricing_item_id || Number(quoteItem.unit_price) > 0) {
          subtotal += Number(quoteItem.total_price);
          return;
        }

        const extractedItem = input.extraction.workItems[index];
        if (!extractedItem) return;
        const pricingItem = await matchWorkItemToPricing(extractedItem);
        if (!pricingItem) return;

        const unitPrice = Number(pricingItem.recommended_price);
        subtotal += unitPrice;
        await updateQuoteItem(quoteItem.id, {
          pricing_item_id: pricingItem.id,
          unit_label: pricingItem.unit_label ?? "item",
          unit_price: unitPrice,
          total_price: unitPrice,
        });
      }),
    );

    if (subtotal > 0) {
      return updateQuote(existingOpenQuote.id, {
        subtotal_amount: subtotal,
        total_amount: Math.max(subtotal - Number(existingOpenQuote.discount_amount), 0),
      });
    }

    return existingOpenQuote;
  }

  const pricedItems = await Promise.all(
    input.extraction.workItems.map(async (item) => ({
      item,
      pricingItem: await matchWorkItemToPricing(item),
    })),
  );
  const subtotal = pricedItems.reduce(
    (sum, entry) => sum + Number(entry.pricingItem?.recommended_price ?? 0),
    0,
  );

  const quote = await createQuote({
    lead_id: input.leadId,
    quote_number: buildQuoteNumber(),
    version_number: 1,
    status_code: "draft",
    created_by_profile_id: input.createdByProfileId ?? null,
    notes: input.extraction.scopeSummary ?? input.extraction.summary,
    subtotal_amount: subtotal,
    discount_amount: 0,
    total_amount: subtotal,
  });

  await Promise.all(
    pricedItems.map(({ item, pricingItem }, index) =>
      createQuoteItem({
        quote_id: quote.id,
        line_no: index + 1,
        title: item.title || "Work item",
        description: item.description ?? item.actionSummary ?? null,
        quantity: 1,
        pricing_item_id: pricingItem?.id ?? null,
        unit_label: pricingItem?.unit_label ?? "item",
        unit_price: Number(pricingItem?.recommended_price ?? 0),
        total_price: Number(pricingItem?.recommended_price ?? 0),
        decision_status: "proposed",
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
