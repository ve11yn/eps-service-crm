import { NextResponse } from "next/server";
import { approveReviewDraft } from "@/backend/services/review/approve-review-draft";
import type { ApproveReviewDraftRequest } from "@/types/api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as ApproveReviewDraftRequest;

    const result = await approveReviewDraft({
      reviewDraftId: id,
      reviewedByProfileId: payload.reviewedByProfileId,
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
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to approve review draft",
      },
      { status: 500 },
    );
  }
}
