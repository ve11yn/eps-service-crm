import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { updateProjectManagement } from "@/backend/services/projects/project-management";
import { requireApiSession } from "@/lib/auth/api";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["owner", "admin", "coordinator"]);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    return NextResponse.json({ success: true, project: await updateProjectManagement(id, await request.json(), auth.session.profile.id) });
  } catch (error) {
    return routeErrorResponse({ scope: "api.projects.management", error, details: { performedByProfileId: auth.session.profile.id } });
  }
}
