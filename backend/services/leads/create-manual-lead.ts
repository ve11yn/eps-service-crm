import "server-only";

import { randomUUID } from "node:crypto";
import { logAuditEvent } from "@/backend/observability/audit";
import { createContact, createLead } from "@/backend/repositories";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/utils/phone";
import { refreshSecondBrain } from "@/backend/services/ai/second-brain";

type ManualLeadInput = {
  customerName: string;
  phone?: string | null;
  email?: string | null;
  title?: string | null;
  request: string;
  profileId: string;
};

function buildLeadCode() {
  return `LEAD-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function createManualLead(input: ManualLeadInput) {
  const customerName = input.customerName.trim();
  const request = input.request.trim();
  if (!customerName) throw new Error("Customer name is required.");
  if (!request) throw new Error("Customer request is required.");

  const phone = input.phone?.trim() ? normalizePhone(input.phone) : null;
  const email = input.email?.trim().toLowerCase() || null;
  const supabase = createAdminSupabaseClient();
  let contact = null;

  if (phone) {
    const byWhatsApp = await supabase.from("contacts").select("*").eq("whatsapp_number", phone).eq("is_archived", false).maybeSingle();
    if (byWhatsApp.error) throw byWhatsApp.error;
    contact = byWhatsApp.data;
    if (!contact) {
      const byPhone = await supabase.from("contacts").select("*").eq("primary_phone", phone).eq("is_archived", false).maybeSingle();
      if (byPhone.error) throw byPhone.error;
      contact = byPhone.data;
    }
  }

  if (!contact) {
    contact = await createContact({
      full_name: customerName,
      primary_phone: phone,
      whatsapp_number: phone,
      email,
    });
  }

  const now = new Date().toISOString();
  const lead = await createLead({
    lead_code: buildLeadCode(),
    title: input.title?.trim() || request.slice(0, 120),
    source_channel_code: "manual",
    status_code: "new_enquiry",
    primary_contact_id: contact.id,
    summary: request,
    lead_summary: request,
    customer_request: request,
    received_at: now,
    last_activity_at: now,
  });

  await logAuditEvent({
    action: "leads.manual_create",
    entityType: "lead",
    entityId: lead.id,
    performedByProfileId: input.profileId,
    newValue: { lead_code: lead.lead_code, title: lead.title, source_channel_code: "manual", primary_contact_id: contact.id },
  });

  await refreshSecondBrain("lead", lead.id, input.profileId);

  return lead;
}
