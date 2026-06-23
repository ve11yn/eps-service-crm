import "server-only";

import {
  createReviewDraft,
  getLatestActiveReviewDraftByThreadId,
  updateReviewDraft,
} from "@/backend/repositories";
import type { Json } from "@/types/database";
import type { AiConversationMessage, AiLeadExtraction } from "@/types/integration";

export async function upsertReviewDraftFromAi(input: {
  threadId: string;
  leadId?: string;
  contactId?: string;
  propertyId?: string;
  messages: AiConversationMessage[];
  extraction: AiLeadExtraction;
  pricingSuggestions?: Json;
}) {
  const existingDraft = await getLatestActiveReviewDraftByThreadId(input.threadId);

  const payload = {
    thread_id: input.threadId,
    lead_id: input.leadId ?? null,
    contact_id: input.contactId ?? null,
    property_id: input.propertyId ?? null,
    status: "needs_review" as const,
    raw_conversation: input.messages as unknown as Json,
    extraction_payload: input.extraction as unknown as Json,
    pricing_suggestions_payload: input.pricingSuggestions ?? [],
  };

  if (existingDraft) {
    return updateReviewDraft(existingDraft.id, payload);
  }

  return createReviewDraft(payload);
}
