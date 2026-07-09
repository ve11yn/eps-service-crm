import { Sidebar } from "@/frontend/components/dashboard/sidebar";
import { requireAppSession } from "@/lib/auth/session";

function toRoleLabel(roleCode: string) {
  switch (roleCode) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "coordinator":
      return "Coordinator";
    case "field_worker":
      return "Field Worker";
    default:
      return roleCode;
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAppSession(["owner", "admin", "coordinator"]);

  return (
    <div className="dashboard-shell">
      <Sidebar
        displayName={session.profile.displayName}
        roleLabel={toRoleLabel(session.profile.roleCode)}
        roleCode={session.profile.roleCode}
      />
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
