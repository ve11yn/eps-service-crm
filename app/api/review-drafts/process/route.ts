import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { processConversationToDraft } from "@/backend/services/review/process-conversation-to-draft";
import { requireApiSession } from "@/lib/auth/api";
import type { ProcessConversationToDraftRequest } from "@/types/api";

export async function POST(request: Request) {
  const auth = await requireApiSession(["owner", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const payload = (await request.json()) as ProcessConversationToDraftRequest;

    if (!payload.threadId) {
      return NextResponse.json(
        { error: "threadId is required" },
        { status: 400 },
      );
    }

    if (payload.messages && (!Array.isArray(payload.messages) || payload.messages.length === 0)) {
      return NextResponse.json(
        { error: "messages must be a non-empty array when provided" },
        { status: 400 },
      );
    }

    const result = await processConversationToDraft({
      threadId: payload.threadId,
      leadId: payload.leadId,
      contactId: payload.contactId,
      propertyId: payload.propertyId,
      contactName: payload.contactName,
      contactPhone: payload.contactPhone,
      messages: payload.messages,
      pricingSuggestions: payload.pricingSuggestions,
    });

    return NextResponse.json({
      success: true,
      reviewDraftId: result.reviewDraft.id,
      status: result.reviewDraft.status,
      simulated: result.aiResult.simulated,
      model: result.aiResult.model,
      extraction: result.aiResult.extraction,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.review-drafts.process",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
