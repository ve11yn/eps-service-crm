import "server-only";

import type {
  WhatsAppInboundMessage,
  WhatsAppMessageType,
  WhatsAppRawInboundPayload,
} from "@/types/integration";

function normalizeMessageType(input: string | null | undefined): WhatsAppMessageType {
  switch (input) {
    case "text":
    case "image":
    case "video":
    case "audio":
    case "document":
      return input;
    default:
      return "unknown";
  }
}

function toIsoString(input: string | null | undefined): string {
  if (!input) {
    return new Date().toISOString();
  }

  const asNumber = Number(input);
  if (!Number.isNaN(asNumber) && input.trim() !== "") {
    return new Date(asNumber * 1000).toISOString();
  }

  return new Date(input).toISOString();
}

export function normalizeWhatsAppInboundPayload(
  payload: WhatsAppRawInboundPayload,
): WhatsAppInboundMessage {
  const externalMessageId = payload.messageId?.trim();
  const externalThreadId = payload.conversationId?.trim();
  const fromPhone = payload.from?.phone?.trim();

  if (!externalMessageId) {
    throw new Error("Missing WhatsApp external message id");
  }

  if (!externalThreadId) {
    throw new Error("Missing WhatsApp external thread id");
  }

  if (!fromPhone) {
    throw new Error("Missing WhatsApp sender phone");
  }

  const normalizedText = payload.text?.trim() || payload.caption?.trim() || undefined;

  return {
    externalMessageId,
    externalThreadId,
    fromPhone,
    fromName: payload.from?.name?.trim() || undefined,
    messageType: normalizeMessageType(payload.type),
    text: normalizedText,
    mediaCaption: payload.caption?.trim() || undefined,
    mediaUrl: payload.mediaUrl?.trim() || undefined,
    mimeType: payload.mimeType?.trim() || undefined,
    sentAt: toIsoString(payload.timestamp),
    providerPayload: payload.raw ?? {},
  };
}
