import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { requireApiSession } from "@/lib/auth/api";

export async function GET() {
  const auth = await requireApiSession();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    return NextResponse.json({
      success: true,
      session: auth.session,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.auth.me",
      error,
    });
  }
}
