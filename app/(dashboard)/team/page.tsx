import { listStaffAccounts } from "@/backend/services/auth/user-management";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";
import { StaffManagement } from "@/frontend/components/settings/staff-management";
import { requireAppSession } from "@/lib/auth/session";

function roleLabel(roleCode: string) {
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

export default async function TeamPage() {
  const session = await requireAppSession(["owner", "admin", "coordinator"]);
  const staff = await listStaffAccounts();
  const canEditTeam = ["owner", "admin"].includes(session.profile.roleCode);

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <h1>Team</h1>
        </div>
      </section>

      {canEditTeam ? (
        <StaffManagement initialStaff={staff} />
      ) : (
      <section className="panel table-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Staff</p>
            <h2>{staff.length} team members</h2>
          </div>
        </div>

        <div className="review-draft-list">
          <div className="review-draft-list-head" aria-hidden="true">
            <span>Name</span>
            <span>Role</span>
            <span>Status</span>
            <span>Leads</span>
            <span>Work Items</span>
          </div>

          {staff.map((member) => (
            <div key={member.id} className="review-draft-row">
              <div>
                <strong>{member.displayName}</strong>
                <span>{member.email ?? member.username ?? "No login label"}</span>
              </div>
              <span>{roleLabel(member.roleCode)}</span>
              <StatusBadge status={member.isActive ? "active" : "inactive"} />
              <span>{member.assignedLeadCount}</span>
              <span>{member.assignedItemCount}</span>
            </div>
          ))}
        </div>
      </section>
      )}
    </div>
  );
}
