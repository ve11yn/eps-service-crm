import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import {
  createStaffUser,
  listStaffAccounts,
} from "@/backend/services/auth/user-management";
import { requireApiSession } from "@/lib/auth/api";
import type { AppRole } from "@/lib/auth/roles";

type CreateStaffRequest = {
  email?: string;
  username?: string;
  password?: string;
  displayName?: string;
  roleCode?: AppRole;
};

export async function GET() {
  const auth = await requireApiSession(["owner", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const staff = await listStaffAccounts();

    return NextResponse.json({
      success: true,
      staff,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.staff.list",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}

export async function POST(request: Request) {
  const auth = await requireApiSession(["owner", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const payload = (await request.json()) as CreateStaffRequest;

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
          error: "username, password, displayName, and roleCode are required",
        },
        { status: 400 },
      );
    }

    if (!["admin", "coordinator", "field_worker"].includes(payload.roleCode)) {
      return NextResponse.json(
        {
          success: false,
          error: "roleCode must be admin, coordinator, or field_worker",
        },
        { status: 400 },
      );
    }

    const result = await createStaffUser({
      email: payload.email.trim(),
      username: payload.username.trim(),
      password: payload.password,
      displayName: payload.displayName.trim(),
      roleCode: payload.roleCode as "admin" | "coordinator" | "field_worker",
      createdByProfileId: auth.session.profile.id,
    });

    return NextResponse.json({
      success: true,
      userId: result.user.id,
      profileId: result.profile.id,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.staff.create",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
