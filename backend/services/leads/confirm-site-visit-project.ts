import "server-only";

import { randomUUID } from "node:crypto";
import { createProject } from "@/backend/repositories";
import { getLeadDetail } from "@/backend/services/leads/get-lead-detail";
import { createAppointment } from "@/backend/services/schedule/appointment-operations";

function buildProjectCode() {
  return `PROJ-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function confirmSiteVisitProject(input: {
  leadId: string;
  confirmedByProfileId?: string | null;
  scheduledStartAt: string;
  scheduledEndAt?: string | null;
}) {
  if (!input.scheduledStartAt) {
    throw new Error("Scheduled day and time are required before creating a project.");
  }

  const lead = await getLeadDetail(input.leadId);

  if (!lead) {
    throw new Error("Lead not found.");
  }

  if (lead.status_code !== "site_visit") {
    throw new Error("Only Site Visit leads can be promoted through site visit confirmation.");
  }

  const now = new Date().toISOString();

  const project = await createProject({
    project_code: buildProjectCode(),
    title: lead.title ?? "Site visit project",
    source_lead_id: lead.id,
    source_channel_code: lead.source_channel_code,
    status_code: "scheduled",
    primary_contact_id: lead.primary_contact_id,
    primary_property_id: lead.primary_property_id,
    whatsapp_thread_id: lead.whatsapp_thread_id,
    scope_summary: lead.summary ?? lead.customer_request,
    remarks: "Created from admin-confirmed site visit.",
    enquiry_at: now,
    scheduled_start_at: input.scheduledStartAt,
    scheduled_end_at: input.scheduledEndAt ?? null,
  });
  const endAt = input.scheduledEndAt ?? new Date(new Date(input.scheduledStartAt).getTime() + 60 * 60 * 1000).toISOString();
  await createAppointment({
    appointmentTypeCode: "site_visit",
    projectId: project.id,
    scheduledStartAt: input.scheduledStartAt,
    scheduledEndAt: endAt,
    statusCode: "scheduled",
    notes: "Site visit confirmed from lead qualification.",
    performedByProfileId: input.confirmedByProfileId as string,
  });
  return project;
}
