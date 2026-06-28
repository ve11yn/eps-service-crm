import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { listLeads } from "@/backend/repositories";
import { requireApiSession } from "@/lib/auth/api";

export async function GET() {
  const auth = await requireApiSession(["owner", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const leads = await listLeads();

    return NextResponse.json({
      success: true,
      leads,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.leads.list",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
