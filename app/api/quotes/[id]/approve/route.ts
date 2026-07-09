import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { approveQuoteAndCreateProject } from "@/backend/services/quotes/approve-quote";
import { requireApiSession } from "@/lib/auth/api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiSession(["owner", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const payload = (await request.json()) as {
      scheduledStartAt?: string;
      scheduledEndAt?: string | null;
    };

    if (!payload.scheduledStartAt) {
      return NextResponse.json(
        { success: false, error: "Scheduled day and time are required." },
        { status: 400 },
      );
    }

    const result = await approveQuoteAndCreateProject({
      quoteId: id,
      approvedByProfileId: auth.session.profile.id,
      scheduledStartAt: payload.scheduledStartAt,
      scheduledEndAt: payload.scheduledEndAt ?? null,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.quotes.approve",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
