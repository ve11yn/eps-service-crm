import { NextResponse } from "next/server";
import { getProfileById } from "@/backend/repositories";
import type { AppRole } from "@/lib/auth/roles";
import { isAppRole } from "@/lib/auth/roles";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AuthorizedApiSession = {
  userId: string;
  email: string | null;
  profile: {
    id: string;
    displayName: string;
    roleCode: AppRole;
    phone: string | null;
    isActive: boolean;
  };
};

export async function requireApiSession(
  allowedRoles?: AppRole[],
): Promise<
  | { ok: true; session: AuthorizedApiSession }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      ),
    };
  }

  const profile = await getProfileById(user.id);

  if (!profile || !profile.is_active || !isAppRole(profile.role_code)) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Profile is not active or role is invalid" },
        { status: 403 },
      ),
    };
  }

  if (allowedRoles && !allowedRoles.includes(profile.role_code)) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "You do not have permission to access this resource" },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    session: {
      userId: user.id,
      email: user.email ?? null,
      profile: {
        id: profile.id,
        displayName: profile.display_name,
        roleCode: profile.role_code,
        phone: profile.phone,
        isActive: profile.is_active,
      },
    },
  };
}
