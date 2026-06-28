import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { getSetupStatus } from "@/backend/services/auth/user-management";

export async function GET() {
  try {
    const status = await getSetupStatus();

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.auth.setup-status",
      error,
    });
  }
}
