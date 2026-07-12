import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { createQuoteRevision } from "@/backend/services/quotes/create-quote-revision";
import { requireApiSession } from "@/lib/auth/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireApiSession(["owner", "admin"]);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const quote = await createQuoteRevision({
      quoteId: id,
      performedByProfileId: auth.session.profile.id,
    });

    return NextResponse.json({ success: true, quote, quoteId: quote?.id ?? null });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.quotes.create_revision",
      error,
      details: { performedByProfileId: auth.session.profile.id },
      status: 400,
    });
  }
}
