import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { logAuditEvent } from "@/backend/observability/audit";
import { getQuoteDetail, updateQuote } from "@/backend/repositories";
import { requireApiSession } from "@/lib/auth/api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const allowedTransitions: Record<string, string[]> = {
  draft: ["sent"],
  sent: ["negotiating", "approved", "expired_rejected"],
  negotiating: ["approved", "expired_rejected"],
  revised: [],
  approved: [],
  expired_rejected: [],
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiSession(["owner", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const quote = await getQuoteDetail(id);

    if (!quote) {
      return NextResponse.json(
        { success: false, error: "Quote not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      quote,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.quotes.detail",
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
    const payload = (await request.json()) as { status?: string };
    const nextStatus = payload.status;

    if (!nextStatus) {
      return NextResponse.json(
        { success: false, error: "status is required" },
        { status: 400 },
      );
    }

    const quote = await getQuoteDetail(id);

    if (!quote) {
      return NextResponse.json(
        { success: false, error: "Quote not found" },
        { status: 404 },
      );
    }

    const allowed = allowedTransitions[quote.status_code] ?? [];
    if (!allowed.includes(nextStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid quote transition: ${quote.status_code} -> ${nextStatus}`,
        },
        { status: 400 },
      );
    }

    if (nextStatus === "approved") {
      return NextResponse.json(
        {
          success: false,
          error: "Use the approve endpoint so project creation is linked.",
        },
        { status: 400 },
      );
    }

    if (nextStatus === "sent") {
      const items = Array.isArray(quote.quote_items) ? quote.quote_items : [];
      const includedItems = items.filter((item) =>
        ["proposed", "approved"].includes(item.decision_status),
      );

      if (includedItems.length === 0 || Number(quote.total_amount) <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Add at least one included, priced item before marking the quote delivered.",
          },
          { status: 400 },
        );
      }
    }

    const now = new Date().toISOString();
    const updatedQuote = await updateQuote(id, {
      status_code: nextStatus,
      sent_at: nextStatus === "sent" ? now : quote.sent_at,
      expired_at: nextStatus === "expired_rejected" ? now : quote.expired_at,
      rejected_at: nextStatus === "expired_rejected" ? now : quote.rejected_at,
    });

    await logAuditEvent({
      action: `quotes.status.${nextStatus}`,
      entityType: "quote",
      entityId: id,
      performedByProfileId: auth.session.profile.id,
      oldValue: { status_code: quote.status_code },
      newValue: { status_code: nextStatus },
    });

    return NextResponse.json({
      success: true,
      quote: updatedQuote,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.quotes.update",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
