import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { logAuditEvent } from "@/backend/observability/audit";
import { getProjectItemById, getProfileById, updateProjectItem } from "@/backend/repositories";
import { requireApiSession } from "@/lib/auth/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiSession(["owner", "admin", "coordinator"]);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const payload = (await request.json()) as {
      assignedProfileId?: string | null;
      beforeAfterRequired?: boolean;
      scheduledStartAt?: string | null;
      scheduledDueAt?: string | null;
    };
    const before = await getProjectItemById(id);
    if (!before) return NextResponse.json({ success: false, error: "Work item not found." }, { status: 404 });

    if (payload.assignedProfileId) {
      const profile = await getProfileById(payload.assignedProfileId);
      if (!profile || !profile.is_active || profile.role_code !== "field_worker") {
        return NextResponse.json({ success: false, error: "Choose an active field worker." }, { status: 400 });
      }
    }

    const item = await updateProjectItem(id, {
      assigned_profile_id: payload.assignedProfileId ?? null,
      before_after_required: Boolean(payload.beforeAfterRequired),
      scheduled_start_at: payload.scheduledStartAt || null,
      scheduled_due_at: payload.scheduledDueAt || null,
    });
    await logAuditEvent({
      action: "project_items.assign",
      entityType: "project_item",
      entityId: id,
      performedByProfileId: auth.session.profile.id,
      oldValue: {
        assigned_profile_id: before.assigned_profile_id,
        before_after_required: before.before_after_required,
        scheduled_start_at: before.scheduled_start_at,
        scheduled_due_at: before.scheduled_due_at,
      },
      newValue: {
        assigned_profile_id: item.assigned_profile_id,
        before_after_required: item.before_after_required,
        scheduled_start_at: item.scheduled_start_at,
        scheduled_due_at: item.scheduled_due_at,
      },
    });
    return NextResponse.json({ success: true, item });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.project_items.assignment",
      error,
      details: { performedByProfileId: auth.session.profile.id },
      status: 400,
    });
  }
}
