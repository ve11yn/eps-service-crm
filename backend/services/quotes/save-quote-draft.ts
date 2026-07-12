import "server-only";

import { logAuditEvent } from "@/backend/observability/audit";
import { getQuoteDetail } from "@/backend/repositories";
import { invalidateCachedTags } from "@/lib/cache/query-cache";
import { CACHE_TAGS } from "@/lib/cache/cache-tags";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export type QuoteDraftItemInput = {
  id?: string | null;
  lineNo: number;
  title: string;
  description?: string | null;
  quantity: number;
  unitLabel?: string | null;
  unitPrice: number;
  notes?: string | null;
  pricingItemId?: string | null;
  decisionStatus: "proposed" | "approved" | "rejected" | "deferred";
  decisionNotes?: string | null;
  pricingMatchStatus?: "matched" | "needs_review" | "manual";
  pricingMatchConfidence?: number | null;
  pricingMatchMethod?: string | null;
  pricingMatchNotes?: string | null;
};

export type SaveQuoteDraftInput = {
  quoteId: string;
  notes?: string | null;
  discountAmount: number;
  items: QuoteDraftItemInput[];
  performedByProfileId?: string | null;
};

function validateInput(input: SaveQuoteDraftInput) {
  if (!input.items.length) throw new Error("A quote must contain at least one item.");
  if (!Number.isFinite(input.discountAmount) || input.discountAmount < 0) {
    throw new Error("Discount must be zero or greater.");
  }

  input.items.forEach((item, index) => {
    if (!item.title.trim()) throw new Error(`Item ${index + 1} needs a title.`);
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new Error(`Item ${index + 1} quantity must be greater than zero.`);
    }
    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      throw new Error(`Item ${index + 1} price cannot be negative.`);
    }
    if (["proposed", "approved"].includes(item.decisionStatus) && item.unitPrice <= 0) {
      throw new Error(`Item ${index + 1} needs a price before it can be included.`);
    }
  });
}

export async function saveQuoteDraft(input: SaveQuoteDraftInput) {
  validateInput(input);
  const before = await getQuoteDetail(input.quoteId);
  if (!before) throw new Error("Quote not found.");
  if (before.status_code !== "draft") {
    throw new Error("Only draft quotes can be edited. Create a revision first.");
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("save_quote_draft_atomic", {
    p_quote_id: input.quoteId,
    p_notes: input.notes as string,
    p_discount_amount: input.discountAmount,
    p_items: input.items as unknown as Json,
  });

  if (error) throw error;

  const { data: savedItems, error: savedItemsError } = await supabase
    .from("quote_items")
    .select("id, line_no")
    .eq("quote_id", input.quoteId);
  if (savedItemsError) throw savedItemsError;
  await Promise.all((savedItems ?? []).map((savedItem) => {
    const submitted = input.items.find((item) => item.lineNo === savedItem.line_no);
    if (!submitted) return Promise.resolve();
    const manuallyPriced = submitted.unitPrice > 0 && submitted.pricingMatchStatus === "needs_review";
    return supabase.from("quote_items").update({
      pricing_match_status: manuallyPriced ? "manual" : submitted.pricingMatchStatus ?? (submitted.pricingItemId ? "matched" : "manual"),
      pricing_match_confidence: manuallyPriced ? null : submitted.pricingMatchConfidence ?? null,
      pricing_match_method: manuallyPriced ? "human" : submitted.pricingMatchMethod ?? null,
      pricing_match_notes: manuallyPriced ? "Price confirmed manually by an administrator." : submitted.pricingMatchNotes ?? null,
    }).eq("id", savedItem.id).then(({ error: updateError }) => {
      if (updateError) throw updateError;
    });
  }));

  invalidateCachedTags([
    CACHE_TAGS.leads,
    CACHE_TAGS.projects,
    CACHE_TAGS.dashboard,
    CACHE_TAGS.requests,
    CACHE_TAGS.reports,
  ]);

  await logAuditEvent({
    action: "quotes.update_draft",
    entityType: "quote",
    entityId: input.quoteId,
    performedByProfileId: input.performedByProfileId ?? null,
    oldValue: {
      subtotal_amount: before.subtotal_amount,
      discount_amount: before.discount_amount,
      total_amount: before.total_amount,
      item_count: Array.isArray(before.quote_items) ? before.quote_items.length : 0,
    },
    newValue: {
      subtotal_amount: data.subtotal_amount,
      discount_amount: data.discount_amount,
      total_amount: data.total_amount,
      item_count: input.items.length,
    },
  });

  return getQuoteDetail(input.quoteId);
}
