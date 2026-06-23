import { NextResponse } from "next/server";
import { upsertReviewDraftFromAi } from "@/backend/services/review/upsert-review-draft";
import type { UpsertReviewDraftFromAiRequest } from "@/types/api";

export async function POST(request: Request) {
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
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create review draft",
      },
      { status: 500 },
    );
  }
}
