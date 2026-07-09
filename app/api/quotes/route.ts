import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { listQuotes } from "@/backend/repositories";
import { requireApiSession } from "@/lib/auth/api";

export async function GET() {
  const auth = await requireApiSession(["owner", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const quotes = await listQuotes();

    return NextResponse.json({
      success: true,
      quotes,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.quotes.list",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
