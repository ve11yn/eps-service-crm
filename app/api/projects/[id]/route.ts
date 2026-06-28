import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { getProjectDetail } from "@/backend/services/projects/get-project-detail";
import { requireApiSession } from "@/lib/auth/api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiSession(["owner", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const project = await getProjectDetail(id);

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.projects.detail",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
