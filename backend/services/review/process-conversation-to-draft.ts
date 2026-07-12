import "server-only";

import { listMessagesByThreadId } from "@/backend/repositories";
import { extractLeadFromConversation } from "@/backend/services/ai/extract-lead-from-conversation";
import { upsertReviewDraftFromAi } from "@/backend/services/review/upsert-review-draft";
import type { Json } from "@/types/database";
import type { AiConversationMessage } from "@/types/integration";

async function loadConversationMessages(
  threadId: string,
): Promise<AiConversationMessage[]> {
  const savedMessages = await listMessagesByThreadId(threadId);

  return savedMessages.slice(-200).map((message) => ({
    direction: message.direction_code === "outbound" ? "outbound" : "inbound",
    senderName: message.sender_name ?? undefined,
    senderPhone: message.sender_phone ?? undefined,
    sentAt: message.sent_at,
    text: message.content ?? message.media_caption ?? "[Attachment]",
  }));
}

export async function processConversationToDraft(input: {
  threadId: string;
  leadId?: string;
  contactId?: string;
  propertyId?: string;
  contactName?: string;
  contactPhone?: string;
  messages?: AiConversationMessage[];
  pricingSuggestions?: Json;
}) {
  const messages =
    input.messages && input.messages.length > 0
      ? input.messages
      : await loadConversationMessages(input.threadId);

  if (messages.length === 0) {
    throw new Error("No saved messages found for this thread.");
  }

  const aiResult = await extractLeadFromConversation({
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    messages,
  });

  const reviewDraft = await upsertReviewDraftFromAi({
    threadId: input.threadId,
    leadId: input.leadId,
    contactId: input.contactId,
    propertyId: input.propertyId,
    messages,
    extraction: aiResult.extraction,
    pricingSuggestions: input.pricingSuggestions,
  });

  return {
    reviewDraft,
    aiResult,
  };
}
