import "server-only";

import type {
  WhatsAppInboundMessage,
  WhatsAppLegacyInboundPayload,
  WhatsAppMessageType,
  WhatsAppMetaWebhookPayload,
  WhatsAppRawInboundPayload,
  WhatsAppSyncedContact,
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

function isMetaWebhookPayload(
  payload: WhatsAppRawInboundPayload,
): payload is WhatsAppMetaWebhookPayload {
  return Array.isArray((payload as WhatsAppMetaWebhookPayload).entry);
}

function normalizeLegacyPayload(
  payload: WhatsAppLegacyInboundPayload,
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
    direction: "inbound",
    isHistorical: false,
    messageType: normalizeMessageType(payload.type),
    text: normalizedText,
    mediaCaption: payload.caption?.trim() || undefined,
    mediaUrl: payload.mediaUrl?.trim() || undefined,
    mimeType: payload.mimeType?.trim() || undefined,
    sentAt: toIsoString(payload.timestamp),
    providerPayload: payload.raw ?? {},
  };
}

function getMetaMessageText(message: {
  text?: { body?: string };
  button?: { text?: string; payload?: string };
  interactive?: {
    button_reply?: { title?: string; id?: string };
    list_reply?: { title?: string; description?: string; id?: string };
  };
}): string | undefined {
  const text = message.text?.body?.trim();
  if (text) return text;

  const buttonText = message.button?.text?.trim();
  if (buttonText) return buttonText;

  const interactiveButton = message.interactive?.button_reply?.title?.trim();
  if (interactiveButton) return interactiveButton;

  const interactiveList = message.interactive?.list_reply?.title?.trim();
  if (interactiveList) return interactiveList;

  return undefined;
}

function normalizeMetaPayload(
  payload: WhatsAppMetaWebhookPayload,
): WhatsAppInboundMessage[] {
  const normalized: WhatsAppInboundMessage[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;

      if (!value?.messages?.length) {
        continue;
      }

      const contact = value.contacts?.[0];
      const contactPhone = contact?.wa_id?.trim();
      const contactName = contact?.profile?.name?.trim() || undefined;
      const phoneNumberId = value.metadata?.phone_number_id?.trim();

      for (const message of value.messages) {
        const externalMessageId = message.id?.trim();
        const fromPhone = contactPhone || message.from?.trim();

        if (!externalMessageId || !fromPhone) {
          continue;
        }

        const externalThreadId = phoneNumberId
          ? `${phoneNumberId}:${fromPhone}`
          : fromPhone;

        const text = getMetaMessageText(message);
        const image = message.image;
        const video = message.video;
        const audio = message.audio;
        const document = message.document;

        normalized.push({
          externalMessageId,
          externalThreadId,
          fromPhone,
          fromName: contactName,
          direction: "inbound",
          isHistorical: false,
          messageType: normalizeMessageType(message.type),
          text,
          mediaCaption:
            image?.caption?.trim() ||
            video?.caption?.trim() ||
            document?.caption?.trim() ||
            undefined,
          mediaUrl: undefined,
          mimeType:
            image?.mime_type?.trim() ||
            video?.mime_type?.trim() ||
            audio?.mime_type?.trim() ||
            document?.mime_type?.trim() ||
            undefined,
          sentAt: toIsoString(message.timestamp),
          providerPayload: {
            object: payload.object ?? null,
            entry_id: entry.id ?? null,
            field: change.field ?? null,
            metadata: value.metadata ?? null,
            contact: contact ?? null,
            message,
          },
        });
      }

      for (const message of value.message_echoes ?? []) {
        const externalMessageId = message.id?.trim();
        const customerPhone = message.to?.trim();
        if (!externalMessageId || !customerPhone) continue;

        const image = message.image;
        const video = message.video;
        const audio = message.audio;
        const document = message.document;

        normalized.push({
          externalMessageId,
          externalThreadId: phoneNumberId
            ? `${phoneNumberId}:${customerPhone}`
            : customerPhone,
          fromPhone: customerPhone,
          direction: "outbound",
          isHistorical: false,
          messageType: normalizeMessageType(message.type),
          text: getMetaMessageText(message),
          mediaCaption:
            image?.caption?.trim() ||
            video?.caption?.trim() ||
            document?.caption?.trim() ||
            undefined,
          mimeType:
            image?.mime_type?.trim() ||
            video?.mime_type?.trim() ||
            audio?.mime_type?.trim() ||
            document?.mime_type?.trim() ||
            undefined,
          sentAt: toIsoString(message.timestamp),
          providerPayload: {
            object: payload.object ?? null,
            entry_id: entry.id ?? null,
            field: change.field ?? null,
            metadata: value.metadata ?? null,
            message_echo: message,
          },
        });
      }

      for (const historyChunk of value.history ?? []) {
        for (const thread of historyChunk.threads ?? []) {
          const customerPhone = thread.id?.trim();
          if (!customerPhone) continue;

          for (const message of thread.messages ?? []) {
            const externalMessageId = message.id?.trim();
            if (!externalMessageId) continue;

            const isInbound = message.from?.trim() === customerPhone;
            const image = message.image;
            const video = message.video;
            const audio = message.audio;
            const document = message.document;

            normalized.push({
              externalMessageId,
              externalThreadId: phoneNumberId
                ? `${phoneNumberId}:${customerPhone}`
                : customerPhone,
              fromPhone: customerPhone,
              direction: isInbound ? "inbound" : "outbound",
              isHistorical: true,
              messageType: normalizeMessageType(message.type),
              text: getMetaMessageText(message),
              mediaCaption:
                image?.caption?.trim() ||
                video?.caption?.trim() ||
                document?.caption?.trim() ||
                undefined,
              mimeType:
                image?.mime_type?.trim() ||
                video?.mime_type?.trim() ||
                audio?.mime_type?.trim() ||
                document?.mime_type?.trim() ||
                undefined,
              sentAt: toIsoString(message.timestamp),
              providerPayload: {
                object: payload.object ?? null,
                entry_id: entry.id ?? null,
                field: change.field ?? null,
                metadata: value.metadata ?? null,
                history_metadata: historyChunk.metadata ?? null,
                history_message: message,
              },
            });
          }
        }
      }
    }
  }

  return normalized;
}

export function normalizeWhatsAppContactSyncs(
  payload: WhatsAppRawInboundPayload,
): WhatsAppSyncedContact[] {
  if (!isMetaWebhookPayload(payload)) return [];

  const contacts: WhatsAppSyncedContact[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const item of change.value?.state_sync ?? []) {
        const phone = item.contact?.phone_number?.trim();
        if (!phone || item.type !== "contact") continue;
        contacts.push({
          phone,
          name:
            item.contact?.full_name?.trim() ||
            item.contact?.first_name?.trim() ||
            undefined,
          action: item.action === "remove" ? "remove" : "add",
        });
      }
    }
  }
  return contacts;
}

export function normalizeWhatsAppInboundPayloads(
  payload: WhatsAppRawInboundPayload,
): WhatsAppInboundMessage[] {
  if (isMetaWebhookPayload(payload)) {
    return normalizeMetaPayload(payload);
  }

  return [normalizeLegacyPayload(payload)];
}

export function normalizeWhatsAppInboundPayload(
  payload: WhatsAppRawInboundPayload,
): WhatsAppInboundMessage {
  const [message] = normalizeWhatsAppInboundPayloads(payload);

  if (!message) {
    throw new Error("No inbound WhatsApp message found in payload");
  }

  return message;
}
