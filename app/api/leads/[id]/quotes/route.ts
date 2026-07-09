import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { createDraftQuoteFromLead } from "@/backend/services/quotes/create-draft-quote-from-lead";
import { requireApiSession } from "@/lib/auth/api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireApiSession(["owner", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const quote = await createDraftQuoteFromLead({
      leadId: id,
      createdByProfileId: auth.session.profile.id,
    });

    return NextResponse.json({
      success: true,
      quoteId: quote.id,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.leads.create-quote",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
