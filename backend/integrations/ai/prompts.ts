import "server-only";

import type {
  AiConversationMessage,
  AiLeadExtractionRequest,
} from "@/types/integration";

function formatConversationLine(message: AiConversationMessage): string {
  const directionLabel = message.direction === "inbound" ? "Customer" : "Staff";
  const sender = message.senderName ? ` (${message.senderName})` : "";
  const sentAt = message.sentAt ? ` [${message.sentAt}]` : "";

  return `${directionLabel}${sender}${sentAt}: ${message.text}`;
}

export function formatConversationTranscript(
  messages: AiConversationMessage[],
): string {
  return messages.map(formatConversationLine).join("\n");
}

export function buildLeadExtractionSystemPrompt(): string {
  return [
    "You are extracting CRM lead data from a WhatsApp conversation.",
    "Return only valid JSON.",
    "Do not wrap the JSON in markdown.",
    "If information is missing, use null for text fields and [] for arrays.",
    "Do not invent facts that are not supported by the conversation.",
    "The response JSON must match this shape exactly:",
    '{',
    '  "summary": "string",',
    '  "urgency": "low" | "medium" | "high",',
    '  "leadTitle": "string | null",',
    '  "projectTitle": "string | null",',
    '  "customerName": "string | null",',
    '  "contactPhone": "string | null",',
    '  "alternatePhone": "string | null",',
    '  "email": "string | null",',
    '  "customerType": "owner" | "tenant" | "landlord" | "agent" | null",',
    '  "address": "string | null",',
    '  "addressLine1": "string | null",',
    '  "unitNumber": "string | null",',
    '  "postalCode": "string | null",',
    '  "propertyName": "string | null",',
    '  "accessNotes": "string | null",',
    '  "issue": "string | null",',
    '  "requestedServices": ["string"],',
    '  "preferredDate": "string | null",',
    '  "preferredTimeWindow": "string | null",',
    '  "labels": ["string"],',
    '  "scopeSummary": "string | null",',
    '  "remarks": "string | null",',
    '  "siteVisitRequired": true,',
    '  "shouldCreateProject": false,',
    '  "workItems": [',
    "    {",
    '      "title": "string",',
    '      "description": "string | null",',
    '      "areaName": "string | null",',
    '      "actionSummary": "string | null",',
    '      "priority": "low" | "normal" | "high" | "urgent" | null",',
    '      "itemType": "string | null",',
    '      "itemGroup": "string | null",',
    '      "isAddOn": false,',
    '      "isPi": false,',
    '      "isChecklistItem": false',
    "    }",
    "  ],",
    '  "confidence": 0.0',
    '}',
    "Use shouldCreateProject=true only when the customer clearly approved, confirmed, or asked to proceed.",
    "Use siteVisitRequired=true when the conversation indicates inspection/checking is needed before a final quote.",
  ].join("\n");
}

export function buildLeadExtractionUserPrompt(
  input: AiLeadExtractionRequest,
): string {
  const transcript = formatConversationTranscript(input.messages);

  return [
    "Extract lead details from this WhatsApp conversation.",
    "",
    `Known contact name: ${input.contactName ?? "unknown"}`,
    `Known contact phone: ${input.contactPhone ?? "unknown"}`,
    "",
    "Conversation:",
    transcript,
  ].join("\n");
}
