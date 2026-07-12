import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function env() {
  const values = { ...process.env };
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !values[match[1]]) values[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return values;
}

test("linked Supabase contains configuration, lifecycle, scheduling, quote safety and Second Brain schema", { timeout: 30000 }, async () => {
  const values = env();
  const url = values.NEXT_PUBLIC_SUPABASE_URL;
  const key = values.SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(url && key, "Supabase environment is required");
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const [settings, photos, stages, appointments, quotes, quoteItems, secondBrain, leadOverview, projectOverview] = await Promise.all([
    supabase.from("app_settings").select("setting_key"),
    supabase.from("service_photo_requirements").select("service_key"),
    supabase.from("project_statuses").select("code").order("sort_order"),
    supabase.from("appointments").select("cancellation_reason,reschedule_reason,customer_confirmation_status,worker_confirmation_status").limit(1),
    supabase.from("quotes").select("valid_until,delivered_at,delivery_method,delivery_reference").limit(1),
    supabase.from("quote_items").select("pricing_match_status,pricing_match_confidence,pricing_match_method").limit(1),
    supabase.from("second_brain_summaries").select("summary_type,source_type,is_locked,is_current").limit(1),
    supabase.from("leads").select("id,title,status_code,summary,qualification_notes,site_visit_required,contacts:primary_contact_id(full_name),properties:primary_property_id(address_line_1,unit_no),quotes(id,status_code,total_amount)").limit(1),
    supabase.from("projects").select("id,title,status_code,scope_summary,scheduled_start_at,project_items(title,status_code,is_deferred,deferred_reason,before_after_required),project_field_updates(update_type,issue_type,notes,requires_attention,resolved_at,resolution_notes,created_at),media_assets(evidence_type),invoices(status_code,balance_due_amount)").limit(1),
  ]);
  for (const result of [settings, photos, stages, appointments, quotes, quoteItems, secondBrain, leadOverview, projectOverview]) {
    assert.equal(result.error, null, result.error?.message);
  }
  assert.ok((settings.data ?? []).some((row) => row.setting_key === "company_details"));
  assert.ok((settings.data ?? []).some((row) => row.setting_key === "tax_settings"));
  assert.ok((photos.data ?? []).some((row) => row.service_key === "plumbing"));
  assert.deepEqual((stages.data ?? []).map((row) => row.code), ["scheduled", "in_progress", "qa_review", "invoiced", "completed"]);
});
