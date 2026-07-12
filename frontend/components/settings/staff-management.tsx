"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

type StaffAccount = {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string;
  roleCode: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  assignedLeadCount: number;
  assignedItemCount: number;
};

type StaffEditForm = {
  id: string;
  displayName: string;
  email: string;
  username: string;
  roleCode: string;
  phone: string;
  isActive: boolean;
};

export function StaffManagement({
  initialStaff,
}: {
  initialStaff: StaffAccount[];
}) {
  const [staff, setStaff] = useState(initialStaff);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [roleCode, setRoleCode] = useState("field_worker");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffEditForm | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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
          email,
          username,
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
      setEmail("");
      setUsername("");
      setPassword("");
      setRoleCode("field_worker");
      setStatus("Staff account created.");
      await reloadStaff();
      setIsCreateOpen(false);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to create staff account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEditing(member: StaffAccount) {
    setStatus(null);
    setEditingStaff({
      id: member.id,
      displayName: member.displayName,
      email: member.email ?? "",
      username: member.username ?? "",
      roleCode: member.roleCode,
      phone: member.phone ?? "",
      isActive: member.isActive,
    });
  }

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingStaff) return;

    setIsUpdating(true);
    setStatus(null);

    try {
      const response = await fetch("/api/staff", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileId: editingStaff.id,
          displayName: editingStaff.displayName,
          email: editingStaff.email,
          username: editingStaff.username,
          roleCode: editingStaff.roleCode,
          phone: editingStaff.phone,
          isActive: editingStaff.isActive,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Failed to update staff account.");
      }

      setEditingStaff(null);
      setStatus("Staff account updated.");
      await reloadStaff();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to update staff account.",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="page-stack team-management">
      <section className="panel team-accounts-panel">
        <div className="panel-header panel-header-no-wrap">
          <div>
            <p className="eyebrow">Access</p>
            <h2>Team Accounts</h2>
          </div>
          <div className="inline-actions">
            <span className="helper-text">{activeStaffCount} active users</span>
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                setStatus(null);
                setIsCreateOpen(true);
              }}
            >
              <Plus size={17} aria-hidden="true" />
              Add staff
            </button>
          </div>
        </div>

        {status && !isCreateOpen && !editingStaff ? <p className="helper-text">{status}</p> : null}

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Assignments</th>
                <th>Status</th>
                <th className="table-action-header" aria-label="Edit" />
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id}>
                  <td>{member.displayName}</td>
                  <td>{member.username ?? "Empty"}</td>
                  <td>{member.email ?? "Empty"}</td>
                  <td>{member.roleCode}</td>
                  <td>{member.assignedLeadCount + member.assignedItemCount}</td>
                  <td>{member.isActive ? "Active" : "Inactive"}</td>
                  <td className="table-action-cell">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => startEditing(member)}
                      aria-label={`Edit ${member.displayName}`}
                    >
                      <Image
                        src="/edit-logo.png"
                        alt=""
                        width={18}
                        height={19}
                        className="icon-button-image"
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isCreateOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) setIsCreateOpen(false);
          }}
        >
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="staff-create-title">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Create user</p>
                <h2 id="staff-create-title">Add Staff Member</h2>
                <p className="helper-text">Create their login and choose what they can access.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting} aria-label="Close add staff form">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form className="form-grid" onSubmit={handleSubmit}>
              <label className="field-block"><span className="field-label">Display Name</span><input className="input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required autoFocus /></label>
              <label className="field-block"><span className="field-label">Role</span><select className="input input-select" value={roleCode} onChange={(event) => setRoleCode(event.target.value)}><option value="admin">Admin</option><option value="coordinator">Coordinator</option><option value="field_worker">Field Worker</option></select></label>
              <label className="field-block"><span className="field-label">Username</span><input className="input" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
              <label className="field-block"><span className="field-label">Email Address</span><input className="input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
              <label className="field-block field-block-wide"><span className="field-label">Temporary Password</span><input className="input" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /><span className="helper-text">Use at least 8 characters. The staff member can use it for their first login.</span></label>
              {status ? <p className="form-error field-block-wide" role="alert">{status}</p> : null}
              <div className="staff-form-button-row field-block-wide">
                <button type="button" className="button button-secondary" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="button button-primary" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create Staff Account"}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {editingStaff ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isUpdating) {
              setEditingStaff(null);
            }
          }}
        >
          <section
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-edit-title"
          >
            <div className="panel-header">
              <div>
                <p className="eyebrow">Edit User</p>
                <h2 id="staff-edit-title">{editingStaff.displayName || "Team Account"}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setEditingStaff(null)}
                disabled={isUpdating}
                aria-label="Close edit form"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.4"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <form className="form-grid" onSubmit={handleEditSubmit}>
              <label className="field-block">
                <span className="field-label">Display Name</span>
                <input
                  className="input"
                  value={editingStaff.displayName}
                  onChange={(event) =>
                    setEditingStaff({ ...editingStaff, displayName: event.target.value })
                  }
                  required
                />
              </label>

              <label className="field-block">
                <span className="field-label">Role</span>
                <select
                  className="input input-select"
                  value={editingStaff.roleCode}
                  onChange={(event) =>
                    setEditingStaff({ ...editingStaff, roleCode: event.target.value })
                  }
                >
                  <option value="owner">Owner</option>
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
                  value={editingStaff.username}
                  onChange={(event) =>
                    setEditingStaff({ ...editingStaff, username: event.target.value })
                  }
                  required
                />
              </label>

              <label className="field-block">
                <span className="field-label">Email Address</span>
                <input
                  className="input"
                  type="email"
                  autoComplete="email"
                  value={editingStaff.email}
                  onChange={(event) =>
                    setEditingStaff({ ...editingStaff, email: event.target.value })
                  }
                  required
                />
              </label>

              <label className="field-block">
                <span className="field-label">Phone</span>
                <input
                  className="input"
                  value={editingStaff.phone}
                  onChange={(event) =>
                    setEditingStaff({ ...editingStaff, phone: event.target.value })
                  }
                />
              </label>

              <label className="field-block">
                <span className="field-label">Status</span>
                <select
                  className="input input-select"
                  value={editingStaff.isActive ? "active" : "inactive"}
                  onChange={(event) =>
                    setEditingStaff({
                      ...editingStaff,
                      isActive: event.target.value === "active",
                    })
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <div className="field-block field-block-wide staff-form-actions">
                <div className="staff-form-button-row">
                  <button type="submit" className="button button-primary" disabled={isUpdating}>
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setEditingStaff(null)}
                    disabled={isUpdating}
                  >
                    Cancel
                  </button>
                </div>
                {status ? <p className="helper-text">{status}</p> : null}
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
