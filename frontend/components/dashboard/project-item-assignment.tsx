"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProjectItemAssignment({
  itemId,
  workers,
  initialAssignedProfileId,
  initialBeforeAfterRequired,
  initialScheduledStartAt,
  initialScheduledDueAt,
}: {
  itemId: string;
  workers: Array<{ id: string; displayName: string }>;
  initialAssignedProfileId: string | null;
  initialBeforeAfterRequired: boolean;
  initialScheduledStartAt: string | null;
  initialScheduledDueAt: string | null;
}) {
  const router = useRouter();
  const [assignedProfileId, setAssignedProfileId] = useState(initialAssignedProfileId ?? "");
  const [beforeAfterRequired, setBeforeAfterRequired] = useState(initialBeforeAfterRequired);
  const [scheduledStartAt, setScheduledStartAt] = useState(initialScheduledStartAt?.slice(0, 16) ?? "");
  const [scheduledDueAt, setScheduledDueAt] = useState(initialScheduledDueAt?.slice(0, 16) ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/project-items/${itemId}/assignment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedProfileId: assignedProfileId || null,
          beforeAfterRequired,
          scheduledStartAt: scheduledStartAt || null,
          scheduledDueAt: scheduledDueAt || null,
        }),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Assignment failed.");
      setMessage("Assignment saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Assignment failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="project-item-assignment">
      <label className="field-block">
        <span className="field-label">Assigned worker</span>
        <select className="input input-select" value={assignedProfileId} onChange={(event) => setAssignedProfileId(event.target.value)}>
          <option value="">Unassigned</option>
          {workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.displayName}</option>)}
        </select>
      </label>
      <label className="field-block">
        <span className="field-label">Worker start</span>
        <input className="input" type="datetime-local" value={scheduledStartAt} onChange={(event) => setScheduledStartAt(event.target.value)} />
      </label>
      <label className="field-block">
        <span className="field-label">Worker due</span>
        <input className="input" type="datetime-local" value={scheduledDueAt} onChange={(event) => setScheduledDueAt(event.target.value)} />
      </label>
      <label className="toggle-row">
        <input type="checkbox" checked={beforeAfterRequired} onChange={(event) => setBeforeAfterRequired(event.target.checked)} />
        <span>Require before and after photos</span>
      </label>
      <button type="button" className="button button-secondary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save assignment"}</button>
      {message ? <span className="helper-text">{message}</span> : null}
    </div>
  );
}
