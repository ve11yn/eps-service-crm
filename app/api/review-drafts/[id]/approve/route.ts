import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { approveReviewDraft } from "@/backend/services/review/approve-review-draft";
import { requireApiSession } from "@/lib/auth/api";
import type { ApproveReviewDraftRequest } from "@/types/api";

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
    const payload = (await request.json()) as ApproveReviewDraftRequest;

    const result = await approveReviewDraft({
      reviewDraftId: id,
      reviewedByProfileId: auth.session.profile.id,
      extractionOverride: payload.extraction,
      createProject: payload.createProject,
    });

    return NextResponse.json({
      success: true,
      reviewDraftId: result.reviewDraft.id,
      contactId: result.contact.id,
      propertyId: result.property?.id ?? null,
      leadId: result.lead.id,
      projectId: result.project?.id ?? null,
      status: result.reviewDraft.status,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.review-drafts.approve",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
