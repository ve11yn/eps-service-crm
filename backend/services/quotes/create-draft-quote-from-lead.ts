import "server-only";

import {
  getLatestReviewDraftByLeadId,
  listQuotesByLeadId,
} from "@/backend/repositories";
import { getLeadDetail } from "@/backend/services/leads/get-lead-detail";
import { ensureDraftQuoteFromExtraction } from "@/backend/services/quotes/create-draft-quote-from-extraction";
import type { AiLeadExtraction } from "@/types/integration";

function parseExtraction(payload: unknown): AiLeadExtraction | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const value = payload as Partial<AiLeadExtraction>;

  return {
    summary: value.summary ?? "",
    urgency: value.urgency ?? "medium",
    leadTitle: value.leadTitle,
    projectTitle: value.projectTitle,
    customerName: value.customerName,
    contactPhone: value.contactPhone,
    alternatePhone: value.alternatePhone,
    email: value.email,
    customerType: value.customerType,
    address: value.address,
    addressLine1: value.addressLine1,
    unitNumber: value.unitNumber,
    postalCode: value.postalCode,
    propertyName: value.propertyName,
    accessNotes: value.accessNotes,
    issue: value.issue,
    requestedServices: Array.isArray(value.requestedServices)
      ? value.requestedServices
      : [],
    preferredDate: value.preferredDate,
    preferredTimeWindow: value.preferredTimeWindow,
    labels: Array.isArray(value.labels) ? value.labels : [],
    scopeSummary: value.scopeSummary,
    remarks: value.remarks,
    siteVisitRequired: Boolean(value.siteVisitRequired),
    shouldCreateProject: false,
    workItems: Array.isArray(value.workItems) ? value.workItems : [],
    confidence: typeof value.confidence === "number" ? value.confidence : 0,
  };
}

export async function createDraftQuoteFromLead(input: {
  leadId: string;
  createdByProfileId?: string | null;
}) {
  const existingQuotes = await listQuotesByLeadId(input.leadId);
  const existingOpenQuote = existingQuotes.find((quote) =>
    ["draft", "sent", "negotiating", "revised", "approved"].includes(
      quote.status_code,
    ),
  );

  if (existingOpenQuote) {
    return existingOpenQuote;
  }

  const [lead, draft] = await Promise.all([
    getLeadDetail(input.leadId),
    getLatestReviewDraftByLeadId(input.leadId),
  ]);

  if (!lead) {
    throw new Error("Lead not found.");
  }

  const extracted = parseExtraction(draft?.extraction_payload);
  const fallbackTitle = lead.customer_request ?? lead.summary ?? lead.title ?? "Lead scope";
  const extraction: AiLeadExtraction = extracted
    ? {
        ...extracted,
        workItems:
          extracted.workItems.length > 0
            ? extracted.workItems
            : [
                {
                  title: fallbackTitle,
                  description: lead.summary ?? lead.customer_request ?? undefined,
                  priority: "normal",
                },
              ],
      }
    : {
        summary: lead.summary ?? fallbackTitle,
        urgency: "medium",
        leadTitle: lead.title ?? undefined,
        customerName: undefined,
        contactPhone: undefined,
        requestedServices: [],
        labels: [],
        scopeSummary: lead.summary ?? fallbackTitle,
        siteVisitRequired: lead.site_visit_required,
        shouldCreateProject: false,
        workItems: [
          {
            title: fallbackTitle,
            description: lead.summary ?? lead.customer_request ?? undefined,
            priority: "normal",
          },
        ],
        confidence: 0,
      };

  const quote = await ensureDraftQuoteFromExtraction({
    leadId: input.leadId,
    createdByProfileId: input.createdByProfileId ?? null,
    extraction,
  });

  if (!quote) {
    throw new Error("Unable to create draft quote from this lead.");
  }

  return quote;
}
