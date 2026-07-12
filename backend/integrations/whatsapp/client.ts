import "server-only";

import { getActiveWhatsAppConnection } from "@/backend/repositories/whatsapp-connections-repository";
import { sendCloudApiMessage } from "@/backend/integrations/whatsapp/graph-client";
import { serverEnv } from "@/lib/env/server";
import type { Json } from "@/types/database";
import type {
  WhatsAppSendDocumentInput,
  WhatsAppSendMessageInput,
  WhatsAppSendResult,
} from "@/types/integration";

type CloudApiCredentials = {
  phoneNumberId: string;
  accessToken: string;
};

async function resolveCloudApiCredentials(): Promise<CloudApiCredentials | null> {
  if (serverEnv.whatsappTokenEncryptionKey) {
    try {
      const connection = await getActiveWhatsAppConnection();
      if (connection) {
        return {
          phoneNumberId: connection.phone_number_id,
          accessToken: connection.accessToken,
        };
      }
    } catch (error) {
      if (!serverEnv.whatsappAccessToken || !serverEnv.whatsappPhoneNumberId) {
        throw error;
      }
    }
  }

  if (serverEnv.whatsappAccessToken && serverEnv.whatsappPhoneNumberId) {
    return {
      phoneNumberId: serverEnv.whatsappPhoneNumberId,
      accessToken: serverEnv.whatsappAccessToken,
    };
  }

  return null;
}

function getExternalMessageId(rawResponse: Json): string | null {
  if (!rawResponse || typeof rawResponse !== "object" || Array.isArray(rawResponse)) {
    return null;
  }

  const messages = rawResponse.messages;
  if (Array.isArray(messages)) {
    const first = messages[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      return typeof first.id === "string" ? first.id : null;
    }
  }

  return typeof rawResponse.messageId === "string"
    ? rawResponse.messageId
    : typeof rawResponse.id === "string"
      ? rawResponse.id
      : null;
}

async function postToLegacyProvider(
  path: string,
  body: Record<string, unknown>,
): Promise<Json> {
  if (!serverEnv.whatsappApiBaseUrl || !serverEnv.whatsappApiKey) {
    throw new Error(
      "WhatsApp is not connected. Configure Cloud API credentials or complete Embedded Signup.",
    );
  }

  const response = await fetch(`${serverEnv.whatsappApiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.whatsappApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as Json;

  if (!response.ok) {
    throw new Error(`WhatsApp provider request failed (${response.status})`);
  }

  return payload;
}

async function sendMessage(
  cloudBody: Record<string, unknown>,
  legacyPath: string,
  legacyBody: Record<string, unknown>,
): Promise<WhatsAppSendResult> {
  const credentials = await resolveCloudApiCredentials();
  const rawResponse = credentials
    ? await sendCloudApiMessage({
        ...credentials,
        body: cloudBody,
      })
    : await postToLegacyProvider(legacyPath, legacyBody);

  return {
    externalMessageId: getExternalMessageId(rawResponse),
    rawResponse,
  };
}

export async function sendWhatsAppTextMessage(
  input: WhatsAppSendMessageInput,
): Promise<WhatsAppSendResult> {
  return sendMessage(
    {
      recipient_type: "individual",
      to: input.to,
      type: "text",
      text: { preview_url: false, body: input.text },
    },
    "/messages/text",
    { to: input.to, text: input.text },
  );
}

export async function sendWhatsAppDocument(
  input: WhatsAppSendDocumentInput,
): Promise<WhatsAppSendResult> {
  return sendMessage(
    {
      recipient_type: "individual",
      to: input.to,
      type: "document",
      document: {
        link: input.documentUrl,
        filename: input.fileName,
        caption: input.caption,
      },
    },
    "/messages/document",
    {
      to: input.to,
      documentUrl: input.documentUrl,
      fileName: input.fileName,
      caption: input.caption,
    },
  );
}
