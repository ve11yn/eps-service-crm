import "server-only";

import {
  buildLeadExtractionSystemPrompt,
  buildLeadExtractionUserPrompt,
} from "@/backend/integrations/ai/prompts";
import {
  isClaudeConfigured,
  sendClaudeTextPrompt,
} from "@/backend/integrations/ai/claude-client";
import type {
  AiExtractedWorkItem,
  AiLeadExtraction,
  AiLeadExtractionRequest,
  AiLeadExtractionResult,
} from "@/types/integration";

function extractJsonObject(rawText: string): string {
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain a valid JSON object.");
  }

  return rawText.slice(start, end + 1);
}

function inferUrgencyFromText(text: string): "low" | "medium" | "high" {
  const normalized = text.toLowerCase();

  if (
    normalized.includes("urgent") ||
    normalized.includes("asap") ||
    normalized.includes("immediately") ||
    normalized.includes("today")
  ) {
    return "high";
  }

  if (
    normalized.includes("this week") ||
    normalized.includes("soon") ||
    normalized.includes("follow up")
  ) {
    return "medium";
  }

  return "low";
}

function inferRequestedServices(text: string): string[] {
  const normalized = text.toLowerCase();
  const services = new Set<string>();

  if (normalized.includes("seepage")) {
    services.add("Seepage inspection/repair");
  }

  if (normalized.includes("leak") || normalized.includes("wc")) {
    services.add("Plumbing repair");
  }

  if (normalized.includes("site visit") || normalized.includes("inspection")) {
    services.add("Site visit");
  }

  return Array.from(services);
}

function inferLabels(
  text: string,
  urgency: "low" | "medium" | "high",
): string[] {
  const labels = new Set<string>();

  if (urgency === "high") {
    labels.add("urgent");
  }

  if (/follow up|follow-up/i.test(text)) {
    labels.add("follow_up");
  }

  if (/landlord/i.test(text)) {
    labels.add("landlord");
  }

  if (/agent/i.test(text)) {
    labels.add("agent");
  }

  return Array.from(labels);
}

function inferWorkItems(text: string): AiExtractedWorkItem[] {
  const items: AiExtractedWorkItem[] = [];

  if (/seepage/i.test(text)) {
    items.push({
      title: "Inspect and address seepage issue",
      description: "Customer reported seepage and needs inspection/repair.",
      itemType: "repair",
      itemGroup: "site_visit",
    });
  }

  if (/wc|toilet|leak/i.test(text)) {
    items.push({
      title: "Inspect leaking WC / plumbing issue",
      description: "Customer reported a bathroom WC leak.",
      itemType: "plumbing",
      itemGroup: "repair",
    });
  }

  return items;
}

function simulateLeadExtraction(
  input: AiLeadExtractionRequest,
): AiLeadExtractionResult {
  const inboundMessages = input.messages.filter(
    (message) => message.direction === "inbound",
  );
  const combinedText = inboundMessages.map((message) => message.text).join(" ");
  const firstCustomerMessage = inboundMessages[0]?.text ?? "";
  const urgency = inferUrgencyFromText(combinedText);
  const addressMatch = combinedText.match(
    /\d+[A-Za-z]?\s+[^.]*?(Singapore\s+\d{6})/i,
  );
  const shouldCreateProject =
    /approved|proceed|go ahead|confirm/i.test(combinedText);
  const siteVisitRequired = /site visit|inspection|check first|not sure/i.test(
    combinedText,
  );

  const extraction: AiLeadExtraction = {
    summary:
      firstCustomerMessage || "Customer started a WhatsApp enquiry with EPS.",
    urgency,
    leadTitle: firstCustomerMessage || undefined,
    projectTitle: undefined,
    customerName: input.contactName,
    contactPhone: input.contactPhone,
    alternatePhone: undefined,
    email: undefined,
    customerType: undefined,
    address: addressMatch?.[0] ?? undefined,
    addressLine1: addressMatch?.[0] ?? undefined,
    unitNumber: undefined,
    postalCode: addressMatch?.[1] ?? undefined,
    propertyName: undefined,
    accessNotes: undefined,
    issue: firstCustomerMessage || undefined,
    requestedServices: inferRequestedServices(combinedText),
    preferredDate: /this week/i.test(combinedText) ? "this week" : undefined,
    preferredTimeWindow: undefined,
    labels: inferLabels(combinedText, urgency),
    scopeSummary: firstCustomerMessage || undefined,
    remarks: undefined,
    siteVisitRequired,
    shouldCreateProject,
    workItems: inferWorkItems(combinedText),
    confidence: 0.45,
  };

  return {
    extraction,
    model: null,
    simulated: true,
    rawText: JSON.stringify(extraction, null, 2),
  };
}

function parseLeadExtraction(rawText: string): AiLeadExtraction {
  const parsed = JSON.parse(extractJsonObject(rawText)) as AiLeadExtraction;

  return {
    summary: parsed.summary,
    urgency: parsed.urgency,
    leadTitle: parsed.leadTitle,
    projectTitle: parsed.projectTitle,
    customerName: parsed.customerName,
    contactPhone: parsed.contactPhone,
    alternatePhone: parsed.alternatePhone,
    email: parsed.email,
    customerType: parsed.customerType,
    address: parsed.address,
    addressLine1: parsed.addressLine1,
    unitNumber: parsed.unitNumber,
    postalCode: parsed.postalCode,
    propertyName: parsed.propertyName,
    accessNotes: parsed.accessNotes,
    issue: parsed.issue,
    requestedServices: Array.isArray(parsed.requestedServices)
      ? parsed.requestedServices
      : [],
    preferredDate: parsed.preferredDate,
    preferredTimeWindow: parsed.preferredTimeWindow,
    labels: Array.isArray(parsed.labels) ? parsed.labels : [],
    scopeSummary: parsed.scopeSummary,
    remarks: parsed.remarks,
    siteVisitRequired: Boolean(parsed.siteVisitRequired),
    shouldCreateProject: Boolean(parsed.shouldCreateProject),
    workItems: Array.isArray(parsed.workItems) ? parsed.workItems : [],
    confidence:
      typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
  };
}

export async function extractLeadFromConversation(
  input: AiLeadExtractionRequest,
): Promise<AiLeadExtractionResult> {
  if (!input.messages.length) {
    throw new Error("At least one message is required for AI extraction.");
  }

  if (!isClaudeConfigured()) {
    return simulateLeadExtraction(input);
  }

  const systemPrompt = buildLeadExtractionSystemPrompt();
  const userPrompt = buildLeadExtractionUserPrompt(input);
  const claudeResponse = await sendClaudeTextPrompt({
    system: systemPrompt,
    user: userPrompt,
  });
  const extraction = parseLeadExtraction(claudeResponse.text);

  return {
    extraction,
    model: claudeResponse.model,
    simulated: false,
    rawText: claudeResponse.text,
  };
}
