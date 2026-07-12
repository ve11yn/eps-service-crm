import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { logAuditEvent } from "@/backend/observability/audit";
import { updateValidation } from "@/backend/services/migrations/notion-migration";
import { requireApiSession } from "@/lib/auth/api";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await requireApiSession(["owner", "admin"]);
  if (!auth.ok) return auth.response;
  try {
    const form = await request.formData();
    const runId = String(form.get("runId"));
    const targetEntityType = String(form.get("targetEntityType") ?? "job");
    const targetEntityId = String(form.get("targetEntityId") ?? "") || null;
    const files = form.getAll("files").filter((value): value is File => value instanceof File);
    if (!files.length) throw new Error("Select one or more attachments.");
    const supabase = createAdminSupabaseClient();
    let uploaded = 0;
    for (const file of files) {
      const path = `notion-migration/${runId}/${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const { error } = await supabase.storage.from("crm-private").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data: attachment, error: recordError } = await supabase.from("notion_migration_attachments").insert({ run_id: runId, target_entity_type: targetEntityType, target_entity_id: targetEntityId, original_file_name: file.name, storage_path: path, mime_type: file.type, file_size: file.size, uploaded_by_profile_id: auth.session.profile.id }).select("id").single();
      if (recordError) throw recordError;
      await supabase.from("notion_migration_rows").insert({ run_id: runId, entity_type: "attachment", source_id: file.name, target_id: targetEntityId, status: "imported", source_data: { attachment_id: attachment.id, storage_path: path, target_entity_type: targetEntityType } });
      uploaded++;
    }
    await updateValidation(runId);
    await logAuditEvent({ action: "notion_migration.attachments", entityType: "notion_migration", entityId: runId, performedByProfileId: auth.session.profile.id, newValue: { uploaded, target_entity_type: targetEntityType, target_entity_id: targetEntityId } });
    return NextResponse.json({ success: true, uploaded });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 });
  }
}
