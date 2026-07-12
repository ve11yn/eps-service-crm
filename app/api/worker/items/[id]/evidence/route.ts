import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { createMediaAsset } from "@/backend/repositories";
import { authorizeWorkerEvidenceUpload } from "@/backend/services/projects/worker-field-operations";
import { requireApiSession } from "@/lib/auth/api";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/backend/observability/audit";

type RouteContext = { params: Promise<{ id: string }> };

const evidenceTypes = new Set([
  "before",
  "during",
  "after",
  "defect",
  "materials",
  "access",
  "marked_up",
]);
const maxFileSize = 12 * 1024 * 1024;

function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "evidence.jpg";
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiSession(["owner", "admin", "coordinator", "field_worker"]);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const form = await request.formData();
    const file = form.get("file");
    const evidenceType = String(form.get("evidenceType") ?? "");
    const caption = String(form.get("caption") ?? "").trim();

    if (!(file instanceof File) || !file.type.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "An image file is required." }, { status: 400 });
    }
    if (file.size > maxFileSize) {
      return NextResponse.json({ success: false, error: "Image must be 12 MB or smaller." }, { status: 400 });
    }
    if (!evidenceTypes.has(evidenceType)) {
      return NextResponse.json({ success: false, error: "Choose a valid evidence type." }, { status: 400 });
    }

    const item = await authorizeWorkerEvidenceUpload({
      itemId: id,
      profileId: auth.session.profile.id,
      roleCode: auth.session.profile.roleCode,
    });
    const path = `worker/${auth.session.profile.id}/projects/${item.project_id}/items/${item.id}/${randomUUID()}-${safeName(file.name)}`;
    const supabase = createAdminSupabaseClient();
    const { error: uploadError } = await supabase.storage.from("crm-media").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const asset = await createMediaAsset({
      project_id: item.project_id,
      project_item_id: item.id,
      storage_bucket: "crm-media",
      storage_path: path,
      mime_type: file.type,
      media_type: "image",
      evidence_type: evidenceType,
      caption: caption || `${evidenceType.replaceAll("_", " ")} - ${item.title}`,
      captured_at: new Date().toISOString(),
      uploaded_by_profile_id: auth.session.profile.id,
    });
    const { data: signed } = await supabase.storage.from("crm-media").createSignedUrl(path, 60 * 60);
    await logAuditEvent({
      action: "evidence.upload", entityType: "media_asset", entityId: asset.id,
      performedByProfileId: auth.session.profile.id,
      newValue: { project_id: item.project_id, project_item_id: item.id, evidence_type: evidenceType, mime_type: file.type, caption: asset.caption },
    });

    return NextResponse.json({ success: true, asset: { ...asset, signedUrl: signed?.signedUrl ?? null } });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.worker.evidence",
      error,
      details: { performedByProfileId: auth.session.profile.id },
      status: 400,
    });
  }
}
