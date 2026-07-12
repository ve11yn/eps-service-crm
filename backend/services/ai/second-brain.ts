import "server-only";

import { isClaudeConfigured, sendClaudeTextPrompt } from "@/backend/integrations/ai/claude-client";
import { logAuditEvent } from "@/backend/observability/audit";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type SecondBrainEntityType = "lead" | "quote" | "project";
export type SummaryType = "lead" | "negotiation" | "approved_scope" | "decision_needed" | "worker_update" | "completion";

const typesByEntity: Record<SecondBrainEntityType, SummaryType[]> = {
  lead: ["lead", "decision_needed"],
  quote: ["negotiation", "approved_scope", "decision_needed"],
  project: ["worker_update", "completion"],
};

export async function listSecondBrainSummaries(entityType: SecondBrainEntityType, entityId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("second_brain_summaries").select("*, profiles:created_by_profile_id(display_name)").eq("entity_type", entityType).eq("entity_id", entityId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function snapshot(entityType: SecondBrainEntityType, entityId: string) {
  const supabase = createAdminSupabaseClient();
  if (entityType === "lead") {
    const { data, error } = await supabase.from("leads").select("id, title, status_code, summary, qualification_notes, site_visit_required, contacts:primary_contact_id(full_name), properties:primary_property_id(address_line_1, unit_no), quotes(id, status_code, total_amount)").eq("id", entityId).single();
    if (error) throw error;
    return data;
  }
  if (entityType === "quote") {
    const { data, error } = await supabase.from("quotes").select("id, quote_number, version_number, status_code, notes, discount_amount, total_amount, valid_until, quote_items(title, decision_status, decision_notes, unit_price, pricing_match_status)").eq("id", entityId).single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("projects").select("id, title, status_code, scope_summary, scheduled_start_at, project_items(title, status_code, is_deferred, deferred_reason, before_after_required), project_field_updates(update_type, issue_type, notes, requires_attention, resolved_at, resolution_notes, created_at), media_assets(evidence_type), invoices(status_code, balance_due_amount)").eq("id", entityId).single();
  if (error) throw error;
  return data;
}

function fallbackSummaries(entityType: SecondBrainEntityType, data: Record<string, unknown>): Partial<Record<SummaryType, string>> {
  if (entityType === "lead") {
    return {
      lead: `${String(data.title ?? "Lead")} is currently ${String(data.status_code ?? "unqualified")}. ${String(data.summary ?? "Scope details still need confirmation.")}`,
      decision_needed: data.site_visit_required ? "Site visit scheduling and approval are required." : String(data.qualification_notes ?? "No unresolved decision is recorded."),
    };
  }
  if (entityType === "quote") {
    const items = Array.isArray(data.quote_items) ? data.quote_items as Array<Record<string, unknown>> : [];
    const included = items.filter((item) => ["proposed", "approved"].includes(String(item.decision_status))).map((item) => String(item.title));
    const excluded = items.filter((item) => ["rejected", "deferred"].includes(String(item.decision_status))).map((item) => String(item.title));
    const unresolved = items.filter((item) => item.pricing_match_status === "needs_review" || Number(item.unit_price) <= 0).map((item) => String(item.title));
    return {
      negotiation: `Quote ${String(data.quote_number)} version ${String(data.version_number)} is ${String(data.status_code)} with a total of ${String(data.total_amount)} and discount of ${String(data.discount_amount)}.`,
      approved_scope: `Included: ${included.join(", ") || "none"}. Excluded or deferred: ${excluded.join(", ") || "none"}.`,
      decision_needed: unresolved.length ? `Pricing must be confirmed for: ${unresolved.join(", ")}.` : "No unresolved quote decision is recorded.",
    };
  }
  const items = Array.isArray(data.project_items) ? data.project_items as Array<Record<string, unknown>> : [];
  const updates = Array.isArray(data.project_field_updates) ? data.project_field_updates as Array<Record<string, unknown>> : [];
  const completed = items.filter((item) => item.status_code === "completed").length;
  const openIssues = updates.filter((update) => update.requires_attention && !update.resolved_at).length;
  return {
    worker_update: `${completed} of ${items.length} work items are complete. ${openIssues} field issue${openIssues === 1 ? " is" : "s are"} unresolved.`,
    completion: completed === items.length && items.length > 0 ? "All work items are complete. Admin evidence review and customer sign-off determine final closeout." : `${items.length - completed} work item${items.length - completed === 1 ? " remains" : "s remain"} before completion.`,
  };
}

async function generateSummaries(entityType: SecondBrainEntityType, data: Record<string, unknown>) {
  if (!isClaudeConfigured()) return { values: fallbackSummaries(entityType, data), source: "system" as const, model: null };
  try {
    const response = await sendClaudeTextPrompt({
      system: `Maintain concise operational CRM summaries. State only facts present in the supplied structured record. Do not invent customer agreements, prices, completion, or decisions. Return JSON only with these exact keys: ${typesByEntity[entityType].join(", ")}. Each value must be a short plain-language string.`,
      user: JSON.stringify(data),
    });
    const parsed = JSON.parse(response.text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()) as Record<string, unknown>;
    const values: Partial<Record<SummaryType, string>> = {};
    for (const type of typesByEntity[entityType]) if (typeof parsed[type] === "string" && parsed[type].trim()) values[type] = parsed[type].trim();
    return { values, source: "ai" as const, model: response.model };
  } catch {
    return { values: fallbackSummaries(entityType, data), source: "system" as const, model: null };
  }
}

async function writeSummary(input: { entityType: SecondBrainEntityType; entityId: string; summaryType: SummaryType; content: string; sourceType: "ai" | "human" | "system"; modelName?: string | null; isLocked?: boolean; profileId?: string | null }) {
  const supabase = createAdminSupabaseClient();
  const { data: current, error: currentError } = await supabase.from("second_brain_summaries").select("*").eq("entity_type", input.entityType).eq("entity_id", input.entityId).eq("summary_type", input.summaryType).eq("is_current", true).maybeSingle();
  if (currentError) throw currentError;
  if (current?.is_locked && input.sourceType !== "human") return current;
  if (current) {
    const { error } = await supabase.from("second_brain_summaries").update({ is_current: false }).eq("id", current.id);
    if (error) throw error;
  }
  const { data, error } = await supabase.from("second_brain_summaries").insert({
    entity_type: input.entityType,
    entity_id: input.entityId,
    summary_type: input.summaryType,
    content: input.content.trim(),
    source_type: input.sourceType,
    model_name: input.modelName ?? null,
    is_locked: input.isLocked ?? current?.is_locked ?? false,
    supersedes_id: current?.id ?? null,
    created_by_profile_id: input.profileId ?? null,
  }).select("*").single();
  if (error) throw error;
  const fieldMap: Record<SummaryType, string> = { lead: "lead_summary", negotiation: "negotiation_summary", approved_scope: "approved_scope_summary", decision_needed: "decision_needed_summary", worker_update: "worker_update_summary", completion: "completion_summary" };
  const field = fieldMap[input.summaryType];
  const content = input.content.trim();
  const syncResult = input.entityType === "lead"
    ? await supabase.from("leads").update(field === "lead_summary" ? { lead_summary: content } : { decision_needed_summary: content }).eq("id", input.entityId)
    : input.entityType === "quote"
      ? await supabase.from("quotes").update(field === "negotiation_summary" ? { negotiation_summary: content } : field === "approved_scope_summary" ? { approved_scope_summary: content } : { decision_needed_summary: content }).eq("id", input.entityId)
      : await supabase.from("projects").update(field === "worker_update_summary" ? { worker_update_summary: content } : { completion_summary: content }).eq("id", input.entityId);
  const syncError = syncResult.error;
  if (syncError) throw syncError;
  return data;
}

export async function refreshSecondBrain(entityType: SecondBrainEntityType, entityId: string, profileId?: string | null) {
  const data = await snapshot(entityType, entityId) as unknown as Record<string, unknown>;
  const generated = await generateSummaries(entityType, data);
  for (const type of typesByEntity[entityType]) {
    const content = generated.values[type];
    if (content) await writeSummary({ entityType, entityId, summaryType: type, content, sourceType: generated.source, modelName: generated.model, profileId });
  }
  await logAuditEvent({ action: "second_brain.refresh", entityType, entityId, performedByProfileId: profileId ?? null, metadata: { summary_types: typesByEntity[entityType], source: generated.source } });
  return listSecondBrainSummaries(entityType, entityId);
}

export async function correctSecondBrainSummary(input: { entityType: SecondBrainEntityType; entityId: string; summaryType: SummaryType; content: string; isLocked: boolean; profileId: string }) {
  if (!typesByEntity[input.entityType].includes(input.summaryType)) throw new Error("This summary type does not belong to the selected record.");
  if (!input.content.trim()) throw new Error("Summary content is required.");
  const result = await writeSummary({ ...input, sourceType: "human" });
  await logAuditEvent({ action: "second_brain.human_correction", entityType: input.entityType, entityId: input.entityId, performedByProfileId: input.profileId, newValue: { summary_type: input.summaryType, content: input.content, is_locked: input.isLocked } });
  return result;
}

export async function setSecondBrainLock(input: { entityType: SecondBrainEntityType; entityId: string; summaryType: SummaryType; isLocked: boolean; profileId: string }) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("second_brain_summaries").update({ is_locked: input.isLocked }).eq("entity_type", input.entityType).eq("entity_id", input.entityId).eq("summary_type", input.summaryType).eq("is_current", true).select("*").single();
  if (error) throw error;
  await logAuditEvent({ action: input.isLocked ? "second_brain.lock" : "second_brain.unlock", entityType: input.entityType, entityId: input.entityId, performedByProfileId: input.profileId, newValue: { summary_type: input.summaryType, is_locked: input.isLocked } });
  return data;
}
