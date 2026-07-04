export const appRoles = ["owner", "admin", "coordinator", "field_worker"] as const;
export const selfRegisterableRoles = ["coordinator", "field_worker"] as const;

export type AppRole = (typeof appRoles)[number];
export type SelfRegisterableRole = (typeof selfRegisterableRoles)[number];

export function isAppRole(value: string | null | undefined): value is AppRole {
  return appRoles.includes((value ?? "") as AppRole);
}

export function canManageStaff(role: AppRole): boolean {
  return role === "owner" || role === "admin";
}

export function canAccessDashboard(role: AppRole): boolean {
  return role === "owner" || role === "admin";
}

export function canSelfRegisterRole(
  role: string | null | undefined,
): role is SelfRegisterableRole {
  return selfRegisterableRoles.includes(
    (role ?? "") as SelfRegisterableRole,
  );
}
