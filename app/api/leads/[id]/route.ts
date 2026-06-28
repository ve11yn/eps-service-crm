import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { getLeadDetail } from "@/backend/services/leads/get-lead-detail";
import { requireApiSession } from "@/lib/auth/api";

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
    const lead = await getLeadDetail(id);

    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      lead,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.leads.detail",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
