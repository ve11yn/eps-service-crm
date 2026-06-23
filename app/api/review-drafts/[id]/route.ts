import { NextResponse } from "next/server";
import {
  getReviewDraftById,
  updateReviewDraft,
} from "@/backend/repositories";
import type { UpdateReviewDraftRequest } from "@/types/api";
import type { Json } from "@/types/database";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const draft = await getReviewDraftById(id);

    if (!draft) {
      return NextResponse.json(
        { success: false, error: "Review draft not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      draft,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get review draft",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as UpdateReviewDraftRequest;

    const draft = await getReviewDraftById(id);

    if (!draft) {
      return NextResponse.json(
        { success: false, error: "Review draft not found" },
        { status: 404 },
      );
    }

    const updatedDraft = await updateReviewDraft(id, {
      status: payload.status ?? draft.status,
      review_notes: payload.reviewNotes ?? draft.review_notes,
      reviewed_by_profile_id:
        payload.reviewedByProfileId ?? draft.reviewed_by_profile_id,
      reviewed_at: payload.reviewedByProfileId
        ? new Date().toISOString()
        : draft.reviewed_at,
      extraction_payload:
        (payload.extraction as unknown as Json | undefined) ??
        draft.extraction_payload,
      pricing_suggestions_payload:
        payload.pricingSuggestions ?? draft.pricing_suggestions_payload,
    });

    return NextResponse.json({
      success: true,
      draft: updatedDraft,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update review draft",
      },
      { status: 500 },
    );
  }
}
