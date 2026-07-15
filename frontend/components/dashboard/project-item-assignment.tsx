"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function toDateTimeInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
}

function toStoredDateTime(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export function ProjectItemAssignment({
  itemId,
  workers,
  initialAssignedProfileId,
  initialBeforeAfterRequired,
  initialScheduledStartAt,
  initialScheduledDueAt,
  followSavedDate = false,
}: {
  itemId: string;
  workers: Array<{ id: string; displayName: string }>;
  initialAssignedProfileId: string | null;
  initialBeforeAfterRequired: boolean;
  initialScheduledStartAt: string | null;
  initialScheduledDueAt: string | null;
  followSavedDate?: boolean;
}) {
  const router = useRouter();
  const [assignedProfileId, setAssignedProfileId] = useState(initialAssignedProfileId ?? "");
  const [beforeAfterRequired, setBeforeAfterRequired] = useState(initialBeforeAfterRequired);
  const [scheduledStartAt, setScheduledStartAt] = useState(toDateTimeInputValue(initialScheduledStartAt));
  const [scheduledDueAt, setScheduledDueAt] = useState(toDateTimeInputValue(initialScheduledDueAt));
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
          scheduledStartAt: toStoredDateTime(scheduledStartAt),
          scheduledDueAt: toStoredDateTime(scheduledDueAt),
        }),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Assignment failed.");
      setMessage("Assignment saved.");
      if (followSavedDate && scheduledStartAt) {
        router.replace(`/?date=${scheduledStartAt.slice(0, 10)}`);
        return;
      }
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
        <span className="field-label">Start date and time</span>
        <input className="input" type="datetime-local" value={scheduledStartAt} onChange={(event) => setScheduledStartAt(event.target.value)} />
      </label>
      <label className="field-block">
        <span className="field-label">Due date and time</span>
        <input className="input" type="datetime-local" value={scheduledDueAt} onChange={(event) => setScheduledDueAt(event.target.value)} />
      </label>
      <label className="toggle-row assignment-photo-toggle">
        <input type="checkbox" checked={beforeAfterRequired} onChange={(event) => setBeforeAfterRequired(event.target.checked)} />
        <span>Require before and after photos</span>
      </label>
      <button type="button" className="button button-primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save assignment"}</button>
      {message ? <span className="helper-text">{message}</span> : null}
    </div>
  );
}
