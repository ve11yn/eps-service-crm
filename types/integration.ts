import type { Json } from "@/types/database";

// for external payloads type

export type WhatsAppMessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "unknown";

export type WhatsAppLegacyInboundPayload = {
  messageId?: string | null;
  conversationId?: string | null;
  from?: {
    phone?: string | null;
    name?: string | null;
  } | null;
  type?: string | null;
  text?: string | null;
  caption?: string | null;
  mediaUrl?: string | null;
  mimeType?: string | null;
  timestamp?: string | null;
  raw?: Json;
};

export type WhatsAppMetaWebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        messaging_product?: string;
        metadata?: {
          display_phone_number?: string;
          phone_number_id?: string;
        };
        contacts?: Array<{
          profile?: {
            name?: string;
          };
          wa_id?: string;
        }>;
        messages?: Array<{
          id?: string;
          from?: string;
          to?: string;
          timestamp?: string;
          type?: string;
          text?: {
            body?: string;
          };
          image?: {
            id?: string;
            mime_type?: string;
            caption?: string;
            sha256?: string;
          };
          video?: {
            id?: string;
            mime_type?: string;
            caption?: string;
            sha256?: string;
          };
          audio?: {
            id?: string;
            mime_type?: string;
            sha256?: string;
          };
          document?: {
            id?: string;
            mime_type?: string;
            caption?: string;
            filename?: string;
            sha256?: string;
          };
          button?: {
            text?: string;
            payload?: string;
          };
          interactive?: {
            button_reply?: {
              id?: string;
              title?: string;
            };
            list_reply?: {
              id?: string;
              title?: string;
              description?: string;
            };
          };
          history_context?: {
            status?: string;
          };
        }>;
        message_echoes?: Array<{
          id?: string;
          from?: string;
          to?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
          image?: { id?: string; mime_type?: string; caption?: string };
          video?: { id?: string; mime_type?: string; caption?: string };
          audio?: { id?: string; mime_type?: string };
          document?: {
            id?: string;
            mime_type?: string;
            caption?: string;
            filename?: string;
          };
        }>;
        history?: Array<{
          metadata?: {
            phase?: string;
            chunk_order?: number;
            progress?: string;
          };
          threads?: Array<{
            id?: string;
            messages?: Array<{
              id?: string;
              from?: string;
              to?: string;
              timestamp?: string;
              type?: string;
              text?: { body?: string };
              image?: { id?: string; mime_type?: string; caption?: string };
              video?: { id?: string; mime_type?: string; caption?: string };
              audio?: { id?: string; mime_type?: string };
              document?: {
                id?: string;
                mime_type?: string;
                caption?: string;
                filename?: string;
              };
              history_context?: { status?: string };
            }>;
          }>;
          errors?: Array<{
            code?: number;
            title?: string;
            message?: string;
          }>;
        }>;
        state_sync?: Array<{
          type?: string;
          contact?: {
            full_name?: string;
            first_name?: string;
            phone_number?: string;
          };
          action?: string;
          metadata?: { timestamp?: string };
        }>;
        statuses?: Array<{
          id?: string;
          status?: string;
          timestamp?: string;
          recipient_id?: string;
          conversation?: {
            id?: string;
            expiration_timestamp?: string;
            origin?: {
              type?: string;
            };
          };
        }>;
      };
    }>;
  }>;
};

export type WhatsAppRawInboundPayload =
  | WhatsAppLegacyInboundPayload
  | WhatsAppMetaWebhookPayload;

export type WhatsAppInboundMessage = {
  externalMessageId: string;
  externalThreadId: string;
  fromPhone: string;
  fromName?: string;
  direction: "inbound" | "outbound";
  isHistorical: boolean;
  messageType: WhatsAppMessageType;
  text?: string;
  mediaCaption?: string;
  mediaUrl?: string;
  mimeType?: string;
  sentAt: string;
  providerPayload: Json;
};

export type WhatsAppSyncedContact = {
  phone: string;
  name?: string;
  action: "add" | "remove";
};

export type WhatsAppSendMessageInput = {
  to: string;
  text: string;
};

export type WhatsAppSendDocumentInput = {
  to: string;
  documentUrl: string;
  fileName?: string;
  caption?: string;
};

export type WhatsAppSendResult = {
  externalMessageId: string | null;
  rawResponse: Json;
};

export type AiConversationMessage = {
  direction: "inbound" | "outbound";
  senderName?: string;
  senderPhone?: string;
  sentAt?: string;
  text: string;
};

export type AiExtractedWorkItem = {
  title: string;
  description?: string;
  areaName?: string;
  actionSummary?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  itemType?: string;
  itemGroup?: string;
  isAddOn?: boolean;
  isPi?: boolean;
  isChecklistItem?: boolean;
  mediaAssets?: AiWorkItemMediaAsset[];
};

export type AiWorkItemMediaAsset = {
  id: string;
  storageBucket: string;
  storagePath: string;
  mimeType?: string | null;
  mediaType?: string | null;
  caption?: string | null;
  fileName?: string | null;
  signedUrl?: string | null;
};

export type AiLeadExtractionRequest = {
  contactName?: string;
  contactPhone?: string;
  messages: AiConversationMessage[];
};

export type AiLeadExtraction = {
  summary: string;
  urgency: "low" | "medium" | "high";
  leadTitle?: string;
  projectTitle?: string;
  customerName?: string;
  contactPhone?: string;
  alternatePhone?: string;
  email?: string;
  customerType?: "owner" | "tenant" | "landlord" | "agent";
  address?: string;
  addressLine1?: string;
  unitNumber?: string;
  postalCode?: string;
  propertyName?: string;
  accessNotes?: string;
  issue?: string;
  requestedServices: string[];
  preferredDate?: string;
  preferredTimeWindow?: string;
  labels: string[];
  scopeSummary?: string;
  remarks?: string;
  siteVisitRequired: boolean;
  shouldCreateProject: boolean;
  workItems: AiExtractedWorkItem[];
  confidence: number;
};

export type AiLeadExtractionResult = {
  extraction: AiLeadExtraction;
  model: string | null;
  simulated: boolean;
  rawText: string;
};
