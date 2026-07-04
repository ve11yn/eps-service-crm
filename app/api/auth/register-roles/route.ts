import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { listPublicRegistrationRoles } from "@/backend/services/auth/user-management";

export async function GET() {
  try {
    const roles = await listPublicRegistrationRoles();

    return NextResponse.json({
      success: true,
      roles,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.auth.register-roles",
      error,
    });
  }
}
