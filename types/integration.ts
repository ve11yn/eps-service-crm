import type { Json } from "@/types/database";

// for external payloads type

export type WhatsAppMessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "unknown";

export type WhatsAppRawInboundPayload = {
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

export type WhatsAppInboundMessage = {
  externalMessageId: string;
  externalThreadId: string;
  fromPhone: string;
  fromName?: string;
  messageType: WhatsAppMessageType;
  text?: string;
  mediaCaption?: string;
  mediaUrl?: string;
  mimeType?: string;
  sentAt: string;
  providerPayload: Json;
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
