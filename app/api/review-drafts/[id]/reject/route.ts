import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { rejectReviewDraft } from "@/backend/services/review/reject-review-draft";
import { requireApiSession } from "@/lib/auth/api";
import type { RejectReviewDraftRequest } from "@/types/api";

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
    const payload = (await request.json()) as RejectReviewDraftRequest;

    const draft = await rejectReviewDraft({
      reviewDraftId: id,
      reviewedByProfileId: auth.session.profile.id,
      reviewNotes: payload.reviewNotes,
      reason: payload.reason,
      markNeedsMoreInfo: payload.markNeedsMoreInfo,
      archive: payload.archive,
    });

    return NextResponse.json({
      success: true,
      reviewDraftId: draft.id,
      status: draft.status,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.review-drafts.reject",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
