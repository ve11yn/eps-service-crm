import { listStaffAccounts } from "@/backend/services/auth/user-management";
import { StaffManagement } from "@/frontend/components/settings/staff-management";

export default async function SettingsPage() {
  const staff = await listStaffAccounts();

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Configuration</p>
          <h1>Settings</h1>
        </div>
        <p className="page-header-copy">
          Manage internal staff access for owner, admin, coordinator, and field worker accounts.
        </p>
      </section>

      <StaffManagement initialStaff={staff} />
    </div>
  );
}
