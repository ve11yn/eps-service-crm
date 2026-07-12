import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { getProjectDetail } from "@/backend/services/projects/get-project-detail";
import { updateProjectStatus } from "@/backend/repositories";
import { requireApiSession } from "@/lib/auth/api";
import { logAuditEvent } from "@/backend/observability/audit";
import { canTransitionProject } from "@/lib/crm/lifecycle";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiSession(["owner", "admin", "coordinator"]);

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

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiSession(["owner", "admin", "coordinator"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const payload = (await request.json()) as { status?: string };
    const nextStatus = payload.status;

    if (!nextStatus) {
      return NextResponse.json(
        { success: false, error: "status is required" },
        { status: 400 },
      );
    }

    const project = await getProjectDetail(id);

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 },
      );
    }

    if (!canTransitionProject(project.status_code, nextStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid project transition: ${project.status_code} -> ${nextStatus}`,
        },
        { status: 400 },
      );
    }

    if (nextStatus === "completed") {
      return NextResponse.json(
        { success: false, error: "Use the closeout validation action to complete a project." },
        { status: 400 },
      );
    }

    const updatedProject = await updateProjectStatus(id, nextStatus);
    await logAuditEvent({
      action: "projects.status_transition", entityType: "project", entityId: id,
      performedByProfileId: auth.session.profile.id,
      oldValue: { status_code: project.status_code }, newValue: { status_code: updatedProject.status_code },
    });

    return NextResponse.json({
      success: true,
      project: updatedProject,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.projects.update",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
