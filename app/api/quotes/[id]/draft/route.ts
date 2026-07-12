import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import {
  saveQuoteDraft,
  type QuoteDraftItemInput,
} from "@/backend/services/quotes/save-quote-draft";
import { requireApiSession } from "@/lib/auth/api";
import { scheduleSecondBrainRefresh } from "@/backend/services/ai/schedule-second-brain-refresh";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireApiSession(["owner", "admin"]);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const payload = (await request.json()) as {
      notes?: string | null;
      discountAmount?: number;
      items?: QuoteDraftItemInput[];
    };

    const quote = await saveQuoteDraft({
      quoteId: id,
      notes: payload.notes ?? null,
      discountAmount: Number(payload.discountAmount ?? 0),
      items: Array.isArray(payload.items) ? payload.items : [],
      performedByProfileId: auth.session.profile.id,
    });
    scheduleSecondBrainRefresh("quote", id, auth.session.profile.id);

    return NextResponse.json({ success: true, quote });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.quotes.save_draft",
      error,
      details: { performedByProfileId: auth.session.profile.id },
      status: 400,
    });
  }
}
