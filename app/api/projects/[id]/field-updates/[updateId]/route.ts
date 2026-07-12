import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { resolveFieldUpdate } from "@/backend/services/projects/worker-field-operations";
import { requireApiSession } from "@/lib/auth/api";
import { scheduleSecondBrainRefresh } from "@/backend/services/ai/schedule-second-brain-refresh";

type RouteContext = { params: Promise<{ id: string; updateId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiSession(["owner", "admin", "coordinator"]);
  if (!auth.ok) return auth.response;

  try {
    const { id, updateId } = await context.params;
    const payload = (await request.json()) as { resolutionNotes?: string | null };
    const fieldUpdate = await resolveFieldUpdate({
      projectId: id,
      updateId,
      resolvedByProfileId: auth.session.profile.id,
      resolutionNotes: payload.resolutionNotes ?? null,
    });
    scheduleSecondBrainRefresh("project", id, auth.session.profile.id);
    return NextResponse.json({ success: true, fieldUpdate });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.projects.resolve_field_update",
      error,
      details: { performedByProfileId: auth.session.profile.id },
      status: 400,
    });
  }
}
