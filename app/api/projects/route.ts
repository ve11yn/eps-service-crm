import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { listProjects } from "@/backend/repositories";
import { requireApiSession } from "@/lib/auth/api";

export async function GET() {
  const auth = await requireApiSession(["owner", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const projects = await listProjects();

    return NextResponse.json({
      success: true,
      projects,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.projects.list",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
