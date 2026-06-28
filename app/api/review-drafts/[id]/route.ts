import { NextResponse } from "next/server";
import { logAuditEvent } from "@/backend/observability/audit";
import { routeErrorResponse } from "@/backend/observability/errors";
import {
  getReviewDraftById,
  updateReviewDraft,
} from "@/backend/repositories";
import { requireApiSession } from "@/lib/auth/api";
import type { UpdateReviewDraftRequest } from "@/types/api";
import type { Json } from "@/types/database";

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
    return routeErrorResponse({
      scope: "api.review-drafts.detail",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiSession(["owner", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

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
      reviewed_by_profile_id: auth.session.profile.id,
      reviewed_at: new Date().toISOString(),
      extraction_payload:
        (payload.extraction as unknown as Json | undefined) ??
        draft.extraction_payload,
      pricing_suggestions_payload:
        payload.pricingSuggestions ?? draft.pricing_suggestions_payload,
    });

    await logAuditEvent({
      action: "review_drafts.update",
      entityType: "review_draft",
      entityId: draft.id,
      performedByProfileId: auth.session.profile.id,
      oldValue: {
        status: draft.status,
        review_notes: draft.review_notes,
      },
      newValue: {
        status: updatedDraft.status,
        review_notes: updatedDraft.review_notes,
      },
    });

    return NextResponse.json({
      success: true,
      draft: updatedDraft,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.review-drafts.update",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
