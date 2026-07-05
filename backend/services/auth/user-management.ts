import "server-only";

import {
  countProfiles,
  getProfileById,
  getProfileByUsername,
  listProfiles,
  updateProfile,
} from "@/backend/repositories";
import { logAuditEvent } from "@/backend/observability/audit";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  canSelfRegisterRole,
  type AppRole,
  type SelfRegisterableRole,
} from "@/lib/auth/roles";
import {
  assertValidUsername,
  normalizeUsername,
} from "@/backend/services/auth/credentials";

type StaffAccount = {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string;
  roleCode: AppRole;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
};

export async function getSetupStatus() {
  const profileCount = await countProfiles();

  return {
    hasUsers: profileCount > 0,
    allowRegistration: true,
  };
}

export async function listPublicRegistrationRoles(): Promise<
  Array<{ code: SelfRegisterableRole; label: string; description: string | null }>
> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("user_roles")
    .select("code, label, description")
    .in("code", ["coordinator", "field_worker"])
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return (data ?? []).filter((role) => canSelfRegisterRole(role.code)) as Array<{
    code: SelfRegisterableRole;
    label: string;
    description: string | null;
  }>;
}

export async function registerSelfServiceUser(input: {
  email: string;
  username: string;
  password: string;
  displayName: string;
  roleCode: SelfRegisterableRole;
}) {
  if (!canSelfRegisterRole(input.roleCode)) {
    throw new Error("This role cannot be self-registered.");
  }

  const username = assertValidUsername(input.username);
  const existingProfile = await getProfileByUsername(username);

  if (existingProfile) {
    throw new Error("That username is already in use.");
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    email_confirm: true,
    user_metadata: {
      username,
      display_name: input.displayName,
      role_code: input.roleCode,
    },
  });

  if (error) throw error;
  if (!data.user) {
    throw new Error("Supabase did not return the created owner user.");
  }

  const profile = await updateProfile(data.user.id, {
    display_name: input.displayName,
    role_code: input.roleCode,
    phone: null,
    username,
    is_active: true,
  });

  await logAuditEvent({
    action: "auth.self_register",
    entityType: "profile",
    entityId: profile.id,
    performedByProfileId: profile.id,
    newValue: {
      email: data.user.email,
      username: profile.username,
      role_code: profile.role_code,
      display_name: profile.display_name,
    },
  });

  return {
    user: data.user,
    profile,
  };
}

export async function listStaffAccounts(): Promise<StaffAccount[]> {
  const supabase = createAdminSupabaseClient();
  const profiles = await listProfiles();

  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (error) throw error;

  const emailByUserId = new Map(
    (data.users ?? []).map((user) => [user.id, user.email ?? null]),
  );

  return profiles.map((profile) => ({
    id: profile.id,
    email: emailByUserId.get(profile.id) ?? null,
    username: profile.username,
    displayName: profile.display_name,
    roleCode: profile.role_code as AppRole,
    phone: profile.phone,
    isActive: profile.is_active,
    createdAt: profile.created_at,
  }));
}

export async function createStaffUser(input: {
  email: string;
  username: string;
  password: string;
  displayName: string;
  roleCode: Extract<AppRole, "admin" | "coordinator" | "field_worker">;
  createdByProfileId: string;
}) {
  const username = assertValidUsername(input.username);
  const existingProfile = await getProfileByUsername(username);

  if (existingProfile) {
    throw new Error("That username is already in use.");
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    email_confirm: true,
    user_metadata: {
      username,
      display_name: input.displayName,
      role_code: input.roleCode,
    },
  });

  if (error) throw error;
  if (!data.user) {
    throw new Error("Supabase did not return the created staff user.");
  }

  const profile = await updateProfile(data.user.id, {
    display_name: input.displayName,
    role_code: input.roleCode,
    phone: null,
    username,
    is_active: true,
  });

  await logAuditEvent({
    action: "auth.create_staff_user",
    entityType: "profile",
    entityId: profile.id,
    performedByProfileId: input.createdByProfileId,
    newValue: {
      username: profile.username,
      role_code: profile.role_code,
      display_name: profile.display_name,
    },
  });

  return {
    user: data.user,
    profile,
  };
}

export async function updateStaffAccount(input: {
  profileId: string;
  email: string;
  username: string;
  displayName: string;
  roleCode: AppRole;
  phone: string | null;
  isActive: boolean;
  performedByProfileId: string;
}) {
  if (!["owner", "admin", "coordinator", "field_worker"].includes(input.roleCode)) {
    throw new Error("roleCode must be owner, admin, coordinator, or field_worker.");
  }

  if (input.profileId === input.performedByProfileId && !input.isActive) {
    throw new Error("You cannot deactivate your own account.");
  }

  if (
    input.profileId === input.performedByProfileId &&
    !["owner", "admin"].includes(input.roleCode)
  ) {
    throw new Error("You cannot remove your own dashboard access.");
  }

  const username = assertValidUsername(input.username);
  const existingProfile = await getProfileByUsername(username);

  if (existingProfile && existingProfile.id !== input.profileId) {
    throw new Error("That username is already in use.");
  }

  const existingTarget = await getProfileById(input.profileId);

  if (!existingTarget) {
    throw new Error("Staff account not found.");
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.auth.admin.updateUserById(input.profileId, {
    email: input.email.trim().toLowerCase(),
    user_metadata: {
      username,
      display_name: input.displayName,
      role_code: input.roleCode,
    },
  });

  if (error) throw error;
  if (!data.user) {
    throw new Error("Supabase did not return the updated staff user.");
  }

  const profile = await updateProfile(input.profileId, {
    display_name: input.displayName,
    role_code: input.roleCode,
    phone: input.phone,
    username,
    is_active: input.isActive,
  });

  await logAuditEvent({
    action: "auth.update_staff_user",
    entityType: "profile",
    entityId: profile.id,
    performedByProfileId: input.performedByProfileId,
    oldValue: {
      username: existingTarget.username,
      role_code: existingTarget.role_code,
      display_name: existingTarget.display_name,
      phone: existingTarget.phone,
      is_active: existingTarget.is_active,
    },
    newValue: {
      email: data.user.email,
      username: profile.username,
      role_code: profile.role_code,
      display_name: profile.display_name,
      phone: profile.phone,
      is_active: profile.is_active,
    },
  });

  return {
    user: data.user,
    profile,
  };
}

export async function resolveLoginEmailByUsername(
  usernameInput: string,
): Promise<string> {
  const username = normalizeUsername(usernameInput);
  const profile = await getProfileByUsername(username);

  if (!profile || !profile.is_active) {
    throw new Error("Invalid username or password.");
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.auth.admin.getUserById(profile.id);

  if (error) throw error;

  const email = data.user?.email;

  if (!email) {
    throw new Error("This account is missing a valid login email.");
  }

  return email;
}
