import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { registerSelfServiceUser } from "@/backend/services/auth/user-management";
import type { SelfRegisterableRole } from "@/lib/auth/roles";

type RegisterRequest = {
  email?: string;
  username?: string;
  password?: string;
  displayName?: string;
  roleCode?: SelfRegisterableRole;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RegisterRequest;

    if (
      !payload.email ||
      !payload.username ||
      !payload.password ||
      !payload.displayName ||
      !payload.roleCode
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "email, username, password, displayName, and roleCode are required",
        },
        { status: 400 },
      );
    }

    const result = await registerSelfServiceUser({
      email: payload.email,
      username: payload.username,
      password: payload.password,
      displayName: payload.displayName,
      roleCode: payload.roleCode,
    });

    return NextResponse.json({
      success: true,
      userId: result.user.id,
      profileId: result.profile.id,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.auth.register",
      error,
      status: 400,
    });
  }
}
