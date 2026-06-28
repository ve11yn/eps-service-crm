import type { Json } from "@/types/database";
import type {
  AiConversationMessage,
  AiExtractedWorkItem,
  AiLeadExtraction,
} from "@/types/integration";

export const emptyLeadExtraction: AiLeadExtraction = {
  summary: "",
  urgency: "medium",
  leadTitle: "",
  projectTitle: "",
  customerName: "",
  contactPhone: "",
  alternatePhone: "",
  email: "",
  customerType: undefined,
  address: "",
  addressLine1: "",
  unitNumber: "",
  postalCode: "",
  propertyName: "",
  accessNotes: "",
  issue: "",
  requestedServices: [],
  preferredDate: "",
  preferredTimeWindow: "",
  labels: [],
  scopeSummary: "",
  remarks: "",
  siteVisitRequired: false,
  shouldCreateProject: false,
  workItems: [],
  confidence: 0,
};

export function parseLeadExtraction(payload: Json): AiLeadExtraction {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return emptyLeadExtraction;
  }

  const value = payload as unknown as Partial<AiLeadExtraction>;

  return {
    ...emptyLeadExtraction,
    ...value,
    requestedServices: Array.isArray(value.requestedServices)
      ? value.requestedServices.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    labels: Array.isArray(value.labels)
      ? value.labels.filter((item): item is string => typeof item === "string")
      : [],
    workItems: Array.isArray(value.workItems)
      ? value.workItems.map(normalizeWorkItem)
      : [],
  };
}

function normalizeWorkItem(item: unknown): AiExtractedWorkItem {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return {
      title: "",
    };
  }

  const value = item as Partial<AiExtractedWorkItem>;

  return {
    title: value.title ?? "",
    description: value.description ?? "",
    areaName: value.areaName ?? "",
    actionSummary: value.actionSummary ?? "",
    priority: value.priority ?? "normal",
    itemType: value.itemType ?? "",
    itemGroup: value.itemGroup ?? "",
    isAddOn: value.isAddOn ?? false,
    isPi: value.isPi ?? false,
    isChecklistItem: value.isChecklistItem ?? false,
  };
}

export function parseConversationMessages(payload: Json): AiConversationMessage[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const messages: AiConversationMessage[] = [];

  for (const item of payload) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const value = item as Partial<AiConversationMessage>;

    if (typeof value.text !== "string" || value.text.trim().length === 0) {
      continue;
    }

    messages.push({
      direction: value.direction === "outbound" ? "outbound" : "inbound",
      senderName: value.senderName,
      senderPhone: value.senderPhone,
      sentAt: value.sentAt,
      text: value.text,
    });
  }

  return messages;
}

export function listToText(value: string[]): string {
  return value.join(", ");
}

export function textToList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
