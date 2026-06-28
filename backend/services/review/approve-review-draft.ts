import "server-only";

import { randomUUID } from "node:crypto";
import {
  createContact,
  createLead,
  createProject,
  createProjectItem,
  createProperty,
  getReviewDraftById,
  updateContact,
  updateLead,
  updateProject,
  updateProperty,
  updateReviewDraft,
} from "@/backend/repositories";
import { logAuditEvent } from "@/backend/observability/audit";
import { normalizePhone } from "@/lib/utils/phone";
import type { Database, Json } from "@/types/database";
import type {
  AiExtractedWorkItem,
  AiLeadExtraction,
} from "@/types/integration";

type ReviewDraftRow = Database["public"]["Tables"]["review_drafts"]["Row"];
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

function buildProjectCode(): string {
  return `PROJ-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function buildLeadCode(): string {
  return `LEAD-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function parseExtraction(payload: Json): AiLeadExtraction {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Review draft extraction payload is invalid.");
  }

  return payload as unknown as AiLeadExtraction;
}

function getAddressLine1(extraction: AiLeadExtraction): string | null {
  return extraction.addressLine1 ?? extraction.address ?? null;
}

async function upsertApprovedContact(
  draft: ReviewDraftRow,
  extraction: AiLeadExtraction,
): Promise<ContactRow> {
  const fullName =
    extraction.customerName ??
    extraction.contactPhone ??
    "Unknown customer";
  const whatsappNumber = extraction.contactPhone
    ? normalizePhone(extraction.contactPhone)
    : null;
  const primaryPhone = extraction.alternatePhone
    ? normalizePhone(extraction.alternatePhone)
    : whatsappNumber;

  if (draft.contact_id) {
    return updateContact(draft.contact_id, {
      full_name: fullName,
      whatsapp_number: whatsappNumber,
      primary_phone: primaryPhone,
      email: extraction.email ?? null,
      notes: extraction.remarks ?? null,
    });
  }

  return createContact({
    full_name: fullName,
    whatsapp_number: whatsappNumber,
    primary_phone: primaryPhone,
    email: extraction.email ?? null,
    notes: extraction.remarks ?? null,
  });
}

async function upsertApprovedProperty(
  draft: ReviewDraftRow,
  extraction: AiLeadExtraction,
): Promise<PropertyRow | null> {
  const addressLine1 = getAddressLine1(extraction);

  if (!addressLine1) {
    return null;
  }

  const payload = {
    property_name: extraction.propertyName ?? null,
    address_line_1: addressLine1,
    address_line_2: null,
    unit_no: extraction.unitNumber ?? null,
    postal_code: extraction.postalCode ?? null,
    access_notes: extraction.accessNotes ?? null,
  };

  if (draft.property_id) {
    return updateProperty(draft.property_id, payload);
  }

  return createProperty(payload);
}

async function upsertApprovedLead(input: {
  draft: ReviewDraftRow;
  extraction: AiLeadExtraction;
  contactId: string;
  propertyId: string | null;
}): Promise<LeadRow> {
  const payload = {
    title:
      input.extraction.leadTitle ??
      input.extraction.projectTitle ??
      input.extraction.issue ??
      "WhatsApp enquiry",
    primary_contact_id: input.contactId,
    primary_property_id: input.propertyId,
    whatsapp_thread_id: input.draft.thread_id,
    summary: input.extraction.summary,
    customer_request: input.extraction.issue ?? input.extraction.summary,
    ai_summary: input.extraction.summary,
    site_visit_required: input.extraction.siteVisitRequired,
    qualification_notes: input.extraction.remarks ?? null,
    last_activity_at: new Date().toISOString(),
  };

  if (input.draft.lead_id) {
    return updateLead(input.draft.lead_id, {
      ...payload,
      status_code: input.extraction.shouldCreateProject ? "converted" : "qualification",
    });
  }

  return createLead({
    lead_code: buildLeadCode(),
    source_channel_code: input.draft.source_channel_code,
    status_code: input.extraction.shouldCreateProject ? "converted" : "qualification",
    received_at: new Date().toISOString(),
    ...payload,
  });
}

async function upsertApprovedProject(input: {
  draft: ReviewDraftRow;
  extraction: AiLeadExtraction;
  leadId: string;
  contactId: string;
  propertyId: string | null;
}): Promise<ProjectRow | null> {
  if (!input.extraction.shouldCreateProject) {
    return null;
  }

  const payload = {
    title:
      input.extraction.projectTitle ??
      input.extraction.leadTitle ??
      input.extraction.issue ??
      "Project from WhatsApp",
    source_lead_id: input.leadId,
    source_channel_code: input.draft.source_channel_code,
    status_code: "scheduled",
    primary_contact_id: input.contactId,
    primary_property_id: input.propertyId,
    whatsapp_thread_id: input.draft.thread_id,
    scope_summary:
      input.extraction.scopeSummary ??
      input.extraction.summary,
    remarks: input.extraction.remarks ?? null,
    enquiry_at: new Date().toISOString(),
    scheduled_start_at: null,
    payment_due_at: null,
    warranty_expires_at: null,
  };

  if (input.draft.approved_project_id) {
    return updateProject(input.draft.approved_project_id, payload);
  }

  return createProject({
    project_code: buildProjectCode(),
    ...payload,
  });
}

async function createApprovedProjectItems(
  projectId: string,
  workItems: AiExtractedWorkItem[],
) {
  for (const [index, item] of workItems.entries()) {
    await createProjectItem({
      project_id: projectId,
      title: item.title,
      description: item.description ?? null,
      area_name: item.areaName ?? null,
      action_summary: item.actionSummary ?? null,
      priority_code:
        item.priority === "urgent"
          ? "urgent"
          : item.priority === "high"
            ? "high"
            : "normal",
      item_group: item.itemGroup ?? null,
      item_type: item.itemType ?? null,
      is_add_on: item.isAddOn ?? false,
      is_pi: item.isPi ?? false,
      is_checklist_item: item.isChecklistItem ?? false,
      sort_order: index,
      status_code: "pending",
    });
  }
}

export async function approveReviewDraft(input: {
  reviewDraftId: string;
  reviewedByProfileId?: string;
  extractionOverride?: AiLeadExtraction;
  createProject?: boolean;
}) {
  const draft = await getReviewDraftById(input.reviewDraftId);

  if (!draft) {
    throw new Error("Review draft not found.");
  }

  const savedExtraction = parseExtraction(draft.extraction_payload);
  const extraction: AiLeadExtraction = {
    ...savedExtraction,
    ...(input.extractionOverride ?? {}),
    shouldCreateProject:
      input.createProject ??
      input.extractionOverride?.shouldCreateProject ??
      savedExtraction.shouldCreateProject,
  };

  const contact = await upsertApprovedContact(draft, extraction);
  const property = await upsertApprovedProperty(draft, extraction);
  const lead = await upsertApprovedLead({
    draft,
    extraction,
    contactId: contact.id,
    propertyId: property?.id ?? null,
  });
  const project = await upsertApprovedProject({
    draft,
    extraction,
    leadId: lead.id,
    contactId: contact.id,
    propertyId: property?.id ?? null,
  });

  if (project && !draft.approved_project_id && extraction.workItems.length > 0) {
    await createApprovedProjectItems(project.id, extraction.workItems);
  }

  const approvedDraft = await updateReviewDraft(draft.id, {
    contact_id: contact.id,
    property_id: property?.id ?? null,
    lead_id: lead.id,
    approved_project_id: project?.id ?? null,
    extraction_payload: extraction as unknown as Json,
    status: project ? "converted_to_project" : "converted_to_lead",
    reviewed_by_profile_id: input.reviewedByProfileId ?? null,
    reviewed_at: new Date().toISOString(),
    approved_at: new Date().toISOString(),
  });

  await logAuditEvent({
    action: "review_drafts.approve",
    entityType: "review_draft",
    entityId: draft.id,
    performedByProfileId: input.reviewedByProfileId ?? null,
    oldValue: {
      status: draft.status,
      lead_id: draft.lead_id,
      approved_project_id: draft.approved_project_id,
    },
    newValue: {
      status: approvedDraft.status,
      lead_id: approvedDraft.lead_id,
      approved_project_id: approvedDraft.approved_project_id,
    },
  });

  return {
    reviewDraft: approvedDraft,
    contact,
    property,
    lead,
    project,
  };
}
