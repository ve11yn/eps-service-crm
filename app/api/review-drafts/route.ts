import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { listReviewDrafts } from "@/backend/repositories";
import { requireApiSession } from "@/lib/auth/api";

export async function GET() {
  const auth = await requireApiSession(["owner", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const drafts = await listReviewDrafts();

    return NextResponse.json({
      success: true,
      drafts,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.review-drafts.list",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
