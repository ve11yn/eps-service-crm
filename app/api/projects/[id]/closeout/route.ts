import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { scheduleSecondBrainRefresh } from "@/backend/services/ai/schedule-second-brain-refresh";
import { updateCloseout } from "@/backend/services/projects/project-closeout";
import { requireApiSession } from "@/lib/auth/api";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const auth = await requireApiSession(["owner", "admin"]);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    const payload = await request.json();
    const project = await updateCloseout({
      projectId: id,
      profileId: auth.session.profile.id,
      action: payload.action,
      notes: payload.notes,
      itemIds: payload.itemIds,
      customerName: payload.customerName,
      warrantyDays: payload.warrantyDays,
      completionSummary: payload.completionSummary,
    });
    scheduleSecondBrainRefresh("project", id, auth.session.profile.id);
    return NextResponse.json({ success: true, project });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.projects.closeout",
      error,
      status: 400,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
