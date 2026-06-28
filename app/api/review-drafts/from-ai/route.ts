import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { upsertReviewDraftFromAi } from "@/backend/services/review/upsert-review-draft";
import { requireApiSession } from "@/lib/auth/api";
import type { UpsertReviewDraftFromAiRequest } from "@/types/api";

export async function POST(request: Request) {
  const auth = await requireApiSession(["owner", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const payload = (await request.json()) as UpsertReviewDraftFromAiRequest;

    if (!payload.threadId) {
      return NextResponse.json(
        { error: "threadId is required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
      return NextResponse.json(
        { error: "messages must be a non-empty array" },
        { status: 400 },
      );
    }

    const reviewDraft = await upsertReviewDraftFromAi({
      threadId: payload.threadId,
      leadId: payload.leadId,
      contactId: payload.contactId,
      propertyId: payload.propertyId,
      messages: payload.messages,
      extraction: payload.extraction,
      pricingSuggestions: payload.pricingSuggestions,
    });

    return NextResponse.json({
      success: true,
      reviewDraftId: reviewDraft.id,
      status: reviewDraft.status,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.review-drafts.from-ai",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
