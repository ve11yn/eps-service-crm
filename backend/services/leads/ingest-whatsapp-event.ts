import "server-only";

import { randomUUID } from "node:crypto";
import {
  createContact,
  createLead,
  createMessage,
  createThread,
  getContactByWhatsAppNumber,
  getLatestLeadByThreadId,
  getMessageByExternalMessageId,
  getThreadByExternalThreadId,
  touchThreadActivity,
  updateContact,
  updateLead,
} from "@/backend/repositories";
import { normalizePhone } from "@/lib/utils/phone";
import type { Database } from "@/types/database";
import type { WhatsAppInboundMessage } from "@/types/integration";

type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type ThreadRow = Database["public"]["Tables"]["whatsapp_threads"]["Row"];
type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

export type IngestWhatsAppEventResult = {
  contact: ContactRow;
  thread: ThreadRow;
  lead: LeadRow;
  message: MessageRow;
  wasDuplicate: boolean;
};

function buildLeadCode(): string {
  return `LEAD-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

async function findOrCreateContact(
  message: WhatsAppInboundMessage,
): Promise<ContactRow> {
  const normalizedPhone = normalizePhone(message.fromPhone);
  const existingContact = await getContactByWhatsAppNumber(normalizedPhone);

  if (!existingContact) {
    return createContact({
      full_name: message.fromName ?? normalizedPhone,
      primary_phone: normalizedPhone,
      whatsapp_number: normalizedPhone,
    });
  }

  if (message.fromName && existingContact.full_name !== message.fromName) {
    return updateContact(existingContact.id, {
      full_name: message.fromName,
    });
  }

  return existingContact;
}

async function findOrCreateThread(
  message: WhatsAppInboundMessage,
  contactId: string,
): Promise<ThreadRow> {
  const existingThread = await getThreadByExternalThreadId(message.externalThreadId);

  if (existingThread) {
    return touchThreadActivity(existingThread.id, message.sentAt);
  }

  return createThread({
    contact_id: contactId,
    external_thread_id: message.externalThreadId,
    thread_subject: message.fromName ?? normalizePhone(message.fromPhone),
    last_message_at: message.sentAt,
  });
}

async function findOrCreateLead(
  message: WhatsAppInboundMessage,
  thread: ThreadRow,
  contactId: string,
): Promise<LeadRow> {
  const existingLead = await getLatestLeadByThreadId(thread.id);

  if (existingLead) {
    return updateLead(existingLead.id, {
      primary_contact_id: contactId,
      last_activity_at: message.sentAt,
      summary: message.text ?? existingLead.summary,
      customer_request: message.text ?? existingLead.customer_request,
    });
  }

  return createLead({
    lead_code: buildLeadCode(),
    title:
      message.text?.slice(0, 120) ??
      `WhatsApp enquiry from ${message.fromName ?? normalizePhone(message.fromPhone)}`,
    primary_contact_id: contactId,
    whatsapp_thread_id: thread.id,
    summary: message.text ?? null,
    customer_request: message.text ?? null,
    received_at: message.sentAt,
    last_activity_at: message.sentAt,
  });
}

export async function ingestWhatsAppEvent(
  message: WhatsAppInboundMessage,
): Promise<IngestWhatsAppEventResult> {
  const existingMessage = await getMessageByExternalMessageId(
    message.externalMessageId,
  );

  if (existingMessage) {
    const existingThread = await getThreadByExternalThreadId(message.externalThreadId);

    if (!existingThread) {
      throw new Error("Duplicate message found, but thread does not exist.");
    }

    const existingLead = await getLatestLeadByThreadId(existingThread.id);

    if (!existingLead) {
      throw new Error("Duplicate message found, but lead does not exist.");
    }

    const contact = await findOrCreateContact(message);

    return {
      contact,
      thread: existingThread,
      lead: existingLead,
      message: existingMessage,
      wasDuplicate: true,
    };
  }

  const contact = await findOrCreateContact(message);
  const thread = await findOrCreateThread(message, contact.id);

  const savedMessage = await createMessage({
    thread_id: thread.id,
    direction_code: "inbound",
    message_type_code: message.messageType === "unknown" ? "text" : message.messageType,
    external_message_id: message.externalMessageId,
    sender_name: message.fromName ?? null,
    sender_phone: normalizePhone(message.fromPhone),
    content: message.text ?? null,
    media_caption: message.mediaCaption ?? null,
    provider_payload: message.providerPayload,
    sent_at: message.sentAt,
  });

  const lead = await findOrCreateLead(message, thread, contact.id);

  return {
    contact,
    thread,
    lead,
    message: savedMessage,
    wasDuplicate: false,
  };
}
