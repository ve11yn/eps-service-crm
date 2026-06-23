import { NextResponse } from "next/server";
import { rejectReviewDraft } from "@/backend/services/review/reject-review-draft";
import type { RejectReviewDraftRequest } from "@/types/api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as RejectReviewDraftRequest;

    const draft = await rejectReviewDraft({
      reviewDraftId: id,
      reviewedByProfileId: payload.reviewedByProfileId,
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
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to reject review draft",
      },
      { status: 500 },
    );
  }
}
