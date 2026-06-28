import "server-only";

import {
  countProfiles,
  getProfileByUsername,
  listProfiles,
  updateProfile,
} from "@/backend/repositories";
import { logAuditEvent } from "@/backend/observability/audit";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { AppRole } from "@/lib/auth/roles";
import {
  assertValidUsername,
  buildInternalAuthEmail,
  normalizeUsername,
} from "@/backend/services/auth/credentials";

type StaffAccount = {
  id: string;
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
    allowOwnerRegistration: profileCount === 0,
  };
}

export async function registerInitialOwner(input: {
  username: string;
  password: string;
  displayName: string;
  phone?: string;
}) {
  const status = await getSetupStatus();

  if (!status.allowOwnerRegistration) {
    throw new Error("Initial owner registration is already completed.");
  }

  const username = assertValidUsername(input.username);
  const existingProfile = await getProfileByUsername(username);

  if (existingProfile) {
    throw new Error("That username is already in use.");
  }

  const email = buildInternalAuthEmail(username);
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      username,
      display_name: input.displayName,
      phone: input.phone ?? null,
      role_code: "owner",
    },
  });

  if (error) throw error;
  if (!data.user) {
    throw new Error("Supabase did not return the created owner user.");
  }

  const profile = await updateProfile(data.user.id, {
    display_name: input.displayName,
    role_code: "owner",
    phone: input.phone ?? null,
    username,
    is_active: true,
  });

  await logAuditEvent({
    action: "auth.register_initial_owner",
    entityType: "profile",
    entityId: profile.id,
    performedByProfileId: profile.id,
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

export async function listStaffAccounts(): Promise<StaffAccount[]> {
  const profiles = await listProfiles();

  return profiles.map((profile) => ({
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    roleCode: profile.role_code as AppRole,
    phone: profile.phone,
    isActive: profile.is_active,
    createdAt: profile.created_at,
  }));
}

export async function createStaffUser(input: {
  username: string;
  password: string;
  displayName: string;
  roleCode: Extract<AppRole, "admin" | "coordinator" | "field_worker">;
  phone?: string;
  createdByProfileId: string;
}) {
  const username = assertValidUsername(input.username);
  const existingProfile = await getProfileByUsername(username);

  if (existingProfile) {
    throw new Error("That username is already in use.");
  }

  const email = buildInternalAuthEmail(username);
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      username,
      display_name: input.displayName,
      phone: input.phone ?? null,
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
    phone: input.phone ?? null,
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
