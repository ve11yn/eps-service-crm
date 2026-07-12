import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import {
  recordWorkerFieldUpdate,
  type WorkerIssueType,
  type WorkerUpdateType,
} from "@/backend/services/projects/worker-field-operations";
import { requireApiSession } from "@/lib/auth/api";

type RouteContext = { params: Promise<{ id: string }> };

const updateTypes = new Set<WorkerUpdateType>([
  "on_the_way",
  "arrived",
  "in_progress",
  "completed",
  "issue",
]);

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiSession(["owner", "admin", "coordinator", "field_worker"]);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const payload = (await request.json()) as {
      updateType?: WorkerUpdateType;
      issueType?: WorkerIssueType | null;
      notes?: string | null;
    };
    if (!payload.updateType || !updateTypes.has(payload.updateType)) {
      return NextResponse.json({ success: false, error: "Valid updateType is required." }, { status: 400 });
    }

    const fieldUpdate = await recordWorkerFieldUpdate({
      itemId: id,
      profileId: auth.session.profile.id,
      roleCode: auth.session.profile.roleCode,
      updateType: payload.updateType,
      issueType: payload.issueType ?? null,
      notes: payload.notes ?? null,
    });
    return NextResponse.json({ success: true, fieldUpdate });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.worker.field_update",
      error,
      details: { performedByProfileId: auth.session.profile.id },
      status: 400,
    });
  }
}
