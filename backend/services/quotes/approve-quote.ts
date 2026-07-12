import "server-only";

import { randomUUID } from "node:crypto";
import {
  createProject,
  createProjectItem,
  getQuoteDetail,
  updateQuote,
  updateQuoteItem,
} from "@/backend/repositories";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/backend/observability/audit";

function buildProjectCode() {
  return `PROJ-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function approveQuoteAndCreateProject(input: {
  quoteId: string;
  approvedByProfileId?: string | null;
  scheduledStartAt: string;
  scheduledEndAt?: string | null;
}) {
  if (!input.scheduledStartAt) {
    throw new Error("Scheduled day and time are required before creating a project.");
  }

  const quote = await getQuoteDetail(input.quoteId);

  if (!quote) {
    throw new Error("Quote not found.");
  }

  if (quote.status_code === "expired_rejected") {
    throw new Error("Rejected or expired quotes cannot create projects.");
  }

  if (quote.project_id) {
    await updateQuote(quote.id, {
      status_code: "approved",
      approved_at: quote.approved_at ?? new Date().toISOString(),
    });

    return {
      quoteId: quote.id,
      projectId: quote.project_id,
      created: false,
    };
  }

  const lead = firstRelation(
    quote.leads as
      | {
          id: string;
          title: string | null;
          primary_contact_id: string | null;
          primary_property_id: string | null;
          whatsapp_thread_id: string | null;
          source_channel_code: string;
          summary: string | null;
          customer_request: string | null;
        }
      | Array<{
          id: string;
          title: string | null;
          primary_contact_id: string | null;
          primary_property_id: string | null;
          whatsapp_thread_id: string | null;
          source_channel_code: string;
          summary: string | null;
          customer_request: string | null;
        }>
      | null,
  );

  if (!lead) {
    throw new Error("Quote must be linked to a lead before approval.");
  }

  const quoteItems = Array.isArray(quote.quote_items)
    ? quote.quote_items.filter((item) =>
        ["proposed", "approved"].includes(item.decision_status),
      )
    : [];

  if (quoteItems.length === 0) {
    throw new Error("Quote must contain at least one included quote item before approval.");
  }

  if (quoteItems.some((item) => Number(item.total_price) <= 0)) {
    throw new Error("Every included quote item must have a price before approval.");
  }

  const now = new Date().toISOString();
  const approvedQuote = await updateQuote(quote.id, {
    status_code: "approved",
    approved_at: quote.approved_at ?? now,
  });

  const project = await createProject({
    project_code: buildProjectCode(),
    title: lead.title ?? `Project for ${approvedQuote.quote_number}`,
    source_lead_id: lead.id,
    source_channel_code: lead.source_channel_code,
    status_code: "scheduled",
    primary_contact_id: lead.primary_contact_id,
    primary_property_id: lead.primary_property_id,
    whatsapp_thread_id: lead.whatsapp_thread_id,
    scope_summary: lead.summary ?? lead.customer_request,
    remarks: approvedQuote.notes,
    enquiry_at: now,
    scheduled_start_at: input.scheduledStartAt,
    scheduled_end_at: input.scheduledEndAt ?? null,
  });

  for (const quoteItem of quoteItems) {
    const projectItem = await createProjectItem({
      project_id: project.id,
      title: quoteItem.title,
      description: quoteItem.description,
      action_summary: quoteItem.notes,
      quoted_amount: quoteItem.total_price,
      sort_order: quoteItem.line_no,
      status_code: "pending",
      priority_code: "normal",
    });

    await updateQuoteItem(quoteItem.id, {
      source_project_item_id: projectItem.id,
    });
  }

  await updateQuote(quote.id, {
    project_id: project.id,
  });

  await logAuditEvent({
    action: "quotes.approve",
    entityType: "quote",
    entityId: quote.id,
    performedByProfileId: input.approvedByProfileId ?? null,
    oldValue: { status_code: quote.status_code, project_id: quote.project_id },
    newValue: { status_code: "approved", project_id: project.id },
    metadata: {
      included_item_ids: quoteItems.map((item) => item.id),
      excluded_item_ids: (Array.isArray(quote.quote_items) ? quote.quote_items : [])
        .filter((item) => ["rejected", "deferred"].includes(item.decision_status))
        .map((item) => item.id),
    },
  });

  if (lead.whatsapp_thread_id) {
    const supabase = createAdminSupabaseClient();
    await supabase
      .from("media_assets")
      .update({
        project_id: project.id,
      })
      .eq("lead_id", lead.id)
      .is("project_id", null);
  }

  return {
    quoteId: quote.id,
    projectId: project.id,
    created: true,
  };
}
