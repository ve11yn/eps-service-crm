import "server-only";

import { redirect } from "next/navigation";
import { getProfileById } from "@/backend/repositories";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/auth/roles";
import { isAppRole } from "@/lib/auth/roles";

export type AppSession = {
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

export async function getCurrentAppSession(): Promise<AppSession | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const profile = await getProfileById(user.id);

  if (!profile || !profile.is_active || !isAppRole(profile.role_code)) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: {
      id: profile.id,
      displayName: profile.display_name,
      roleCode: profile.role_code,
      phone: profile.phone,
      isActive: profile.is_active,
    },
  };
}

export async function requireAppSession(allowedRoles?: AppRole[]) {
  const session = await getCurrentAppSession();

  if (!session) {
    redirect("/login");
  }

  if (allowedRoles && !allowedRoles.includes(session.profile.roleCode)) {
    redirect("/unauthorized");
  }

  return session;
}
