import "server-only";

import {
  createMessage,
  getContactById,
  getLatestLeadByThreadId,
  getThreadById,
  touchThreadActivity,
  updateLead,
} from "@/backend/repositories";
import { logAuditEvent } from "@/backend/observability/audit";
import { sendWhatsAppTextMessage } from "@/backend/integrations/whatsapp/client";
import { normalizePhone } from "@/lib/utils/phone";
import type { Database } from "@/types/database";

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

export type SendWhatsAppMessageResult = {
  message: MessageRow;
  externalMessageId: string | null;
};

export async function sendWhatsAppMessage(input: {
  threadId: string;
  text: string;
  to?: string;
  senderName?: string;
}): Promise<SendWhatsAppMessageResult> {
  const thread = await getThreadById(input.threadId);

  if (!thread) {
    throw new Error("WhatsApp thread not found.");
  }

  const contact = await getContactById(thread.contact_id);

  if (!contact) {
    throw new Error("Thread contact not found.");
  }

  const destination = normalizePhone(
    input.to ?? contact.whatsapp_number ?? contact.primary_phone ?? "",
  );

  if (!destination) {
    throw new Error("Contact does not have a WhatsApp number.");
  }

  const sendResult = await sendWhatsAppTextMessage({
    to: destination,
    text: input.text,
  });

  const sentAt = new Date().toISOString();

  const savedMessage = await createMessage({
    thread_id: thread.id,
    direction_code: "outbound",
    message_type_code: "text",
    external_message_id: sendResult.externalMessageId,
    sender_name: input.senderName ?? "CRM Admin",
    sender_phone: null,
    content: input.text,
    media_caption: null,
    provider_payload: sendResult.rawResponse,
    sent_at: sentAt,
  });

  await touchThreadActivity(thread.id, sentAt);

  const latestLead = await getLatestLeadByThreadId(thread.id);

  if (latestLead) {
    await updateLead(latestLead.id, {
      last_activity_at: sentAt,
    });
  }

  await logAuditEvent({
    action: "messages.send_whatsapp",
    entityType: "message",
    entityId: savedMessage.id,
    metadata: {
      thread_id: thread.id,
      destination,
      external_message_id: sendResult.externalMessageId,
    },
  });

  return {
    message: savedMessage,
    externalMessageId: sendResult.externalMessageId,
  };
}
