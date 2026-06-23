import "server-only";

import { serverEnv } from "@/lib/env/server";
import type { Json } from "@/types/database";
import type {
  WhatsAppSendDocumentInput,
  WhatsAppSendMessageInput,
  WhatsAppSendResult,
} from "@/types/integration";

// post to whatsapp, send whatsapp text message, send whatsapp document

async function postToWhatsApp<TBody extends Record<string, unknown>>(
  path: string,
  body: TBody,
): Promise<WhatsAppSendResult> {
  if (!serverEnv.whatsappApiBaseUrl || !serverEnv.whatsappApiKey) {
    throw new Error("Missing WHATSAPP_API_BASE_URL or WHATSAPP_API_KEY");
  }

  const response = await fetch(`${serverEnv.whatsappApiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.whatsappApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const rawResponse = (await response.json().catch(() => ({}))) as Json;

  if (!response.ok) {
    throw new Error(
      `WhatsApp API request failed with status ${response.status}: ${JSON.stringify(rawResponse)}`,
    );
  }

  const responseObject =
    rawResponse && typeof rawResponse === "object" && !Array.isArray(rawResponse)
      ? rawResponse
      : {};

  const externalMessageId =
    typeof responseObject.messageId === "string"
      ? responseObject.messageId
      : typeof responseObject.id === "string"
        ? responseObject.id
        : null;

  return {
    externalMessageId,
    rawResponse,
  };
}

export async function sendWhatsAppTextMessage(
  input: WhatsAppSendMessageInput,
): Promise<WhatsAppSendResult> {
  return postToWhatsApp("/messages/text", {
    to: input.to,
    text: input.text,
  });
}

export async function sendWhatsAppDocument(
  input: WhatsAppSendDocumentInput,
): Promise<WhatsAppSendResult> {
  return postToWhatsApp("/messages/document", {
    to: input.to,
    documentUrl: input.documentUrl,
    fileName: input.fileName,
    caption: input.caption,
  });
}
