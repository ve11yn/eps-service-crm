import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { confirmSiteVisitProject } from "@/backend/services/leads/confirm-site-visit-project";
import { requireApiSession } from "@/lib/auth/api";
import { scheduleSecondBrainRefresh } from "@/backend/services/ai/schedule-second-brain-refresh";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiSession(["owner", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const payload = (await request.json()) as {
      scheduledStartAt?: string;
      scheduledEndAt?: string | null;
    };

    if (!payload.scheduledStartAt) {
      return NextResponse.json(
        { success: false, error: "Scheduled day and time are required." },
        { status: 400 },
      );
    }

    const project = await confirmSiteVisitProject({
      leadId: id,
      confirmedByProfileId: auth.session.profile.id,
      scheduledStartAt: payload.scheduledStartAt,
      scheduledEndAt: payload.scheduledEndAt ?? null,
    });
    scheduleSecondBrainRefresh("lead", id, auth.session.profile.id);

    return NextResponse.json({
      success: true,
      projectId: project.id,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.leads.confirm-site-visit",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
