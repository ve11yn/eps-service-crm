import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { registerInitialOwner } from "@/backend/services/auth/user-management";

type RegisterOwnerRequest = {
  username?: string;
  password?: string;
  displayName?: string;
  phone?: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RegisterOwnerRequest;

    if (!payload.username || !payload.password || !payload.displayName) {
      return NextResponse.json(
        {
          success: false,
          error: "username, password, and displayName are required",
        },
        { status: 400 },
      );
    }

    const result = await registerInitialOwner({
      username: payload.username.trim(),
      password: payload.password,
      displayName: payload.displayName.trim(),
      phone: payload.phone?.trim() || undefined,
    });

    return NextResponse.json({
      success: true,
      userId: result.user.id,
      profileId: result.profile.id,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.auth.register-owner",
      error,
    });
  }
}
