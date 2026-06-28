"use client";

import { useMemo, useState } from "react";

type StaffAccount = {
  id: string;
  username: string | null;
  displayName: string;
  roleCode: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
};

export function StaffManagement({
  initialStaff,
}: {
  initialStaff: StaffAccount[];
}) {
  const [staff, setStaff] = useState(initialStaff);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [roleCode, setRoleCode] = useState("field_worker");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeStaffCount = useMemo(
    () => staff.filter((item) => item.isActive).length,
    [staff],
  );

  async function reloadStaff() {
    const response = await fetch("/api/staff");
    const payload = (await response.json()) as {
      success?: boolean;
      staff?: StaffAccount[];
      error?: string;
    };

    if (!response.ok || !payload.success || !payload.staff) {
      throw new Error(payload.error ?? "Failed to reload staff.");
    }

    setStaff(payload.staff);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName,
          username,
          phone,
          password,
          roleCode,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Failed to create staff account.");
      }

      setDisplayName("");
      setUsername("");
      setPhone("");
      setPassword("");
      setRoleCode("field_worker");
      setStatus("Staff account created.");
      await reloadStaff();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to create staff account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Access</p>
            <h2>Team Accounts</h2>
          </div>
          <span className="helper-text">{activeStaffCount} active users</span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id}>
                  <td>{member.displayName}</td>
                  <td>{member.username ?? "Empty"}</td>
                  <td>{member.roleCode}</td>
                  <td>{member.phone ?? "Empty"}</td>
                  <td>{member.isActive ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Create User</p>
            <h2>Add Staff Member</h2>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field-block">
            <span className="field-label">Display Name</span>
            <input
              className="input"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
            />
          </label>

          <label className="field-block">
            <span className="field-label">Role</span>
            <select
              className="input input-select"
              value={roleCode}
              onChange={(event) => setRoleCode(event.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="coordinator">Coordinator</option>
              <option value="field_worker">Field Worker</option>
            </select>
          </label>

          <label className="field-block">
            <span className="field-label">Username</span>
            <input
              className="input"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>

          <label className="field-block">
            <span className="field-label">Phone</span>
            <input
              className="input"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>

          <label className="field-block field-block-wide">
            <span className="field-label">Temporary Password</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
          </label>

          <div className="field-block field-block-wide">
            <button type="submit" className="button button-primary" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Staff Account"}
            </button>
            {status ? <p className="helper-text">{status}</p> : null}
          </div>
        </form>
      </section>
    </div>
  );
}
