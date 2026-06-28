import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { resolveLoginEmailByUsername } from "@/backend/services/auth/user-management";

type LoginLookupRequest = {
  username?: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as LoginLookupRequest;

    if (!payload.username) {
      return NextResponse.json(
        {
          success: false,
          error: "username is required",
        },
        { status: 400 },
      );
    }

    const email = await resolveLoginEmailByUsername(payload.username);

    return NextResponse.json({
      success: true,
      email,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.auth.login-lookup",
      error,
      status: 400,
    });
  }
}
