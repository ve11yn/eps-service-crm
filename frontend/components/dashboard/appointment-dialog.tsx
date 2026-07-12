"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type AppointmentEvent = {
  id: string;
  entityKind: "appointment" | "project";
  projectId: string | null;
  leadId: string | null;
  title: string;
  typeCode: string;
  typeLabel: string;
  status: string;
  workerId: string | null;
  workerName: string | null;
  scheduledStartAt: string;
  scheduledEndAt: string | null;
  notes: string | null;
  cancellationReason: string | null;
  rescheduleReason: string | null;
  customerConfirmationStatus: string;
  workerConfirmationStatus: string;
};

type Option = { id: string; title?: string | null; display_name?: string; availability_status?: string };
type AppointmentType = { code: string; label: string };

function localInputValue(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AppointmentDialog({
  event,
  selectedDate,
  projects,
  leads,
  workers,
  appointmentTypes,
  onClose,
}: {
  event?: AppointmentEvent | null;
  selectedDate: Date;
  projects: Option[];
  leads: Option[];
  workers: Option[];
  appointmentTypes: AppointmentType[];
  onClose: () => void;
}) {
  const router = useRouter();
  const defaults = useMemo(() => {
    const start = new Date(selectedDate);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(10);
    return { start: localInputValue(start), end: localInputValue(end) };
  }, [selectedDate]);
  const editable = event?.entityKind !== "project";
  const [parentType, setParentType] = useState<"project" | "lead">(event?.leadId ? "lead" : "project");
  const [parentId, setParentId] = useState(event?.leadId ?? event?.projectId ?? "");
  const [typeCode, setTypeCode] = useState(event?.typeCode ?? "work_execution");
  const [workerId, setWorkerId] = useState(event?.workerId ?? "");
  const [startAt, setStartAt] = useState(event ? localInputValue(event.scheduledStartAt) : defaults.start);
  const [endAt, setEndAt] = useState(event?.scheduledEndAt ? localInputValue(event.scheduledEndAt) : defaults.end);
  const [status, setStatus] = useState(event?.status ?? "scheduled");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [cancellationReason, setCancellationReason] = useState(event?.cancellationReason ?? "");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [customerConfirmation, setCustomerConfirmation] = useState(event?.customerConfirmationStatus ?? "pending");
  const [workerConfirmation, setWorkerConfirmation] = useState(event?.workerConfirmationStatus ?? "pending");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    if (!editable || !parentId || !startAt || !endAt) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(event ? `/api/appointments/${event.id}` : "/api/appointments", {
        method: event ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentTypeCode: typeCode,
          projectId: parentType === "project" ? parentId : null,
          leadId: parentType === "lead" ? parentId : null,
          assignedProfileId: workerId || null,
          scheduledStartAt: new Date(startAt).toISOString(),
          scheduledEndAt: new Date(endAt).toISOString(),
          statusCode: status,
          notes,
          cancellationReason,
          rescheduleReason,
          customerConfirmationStatus: customerConfirmation,
          workerConfirmationStatus: workerConfirmation,
        }),
      });
      const payload = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Unable to save appointment.");
      router.refresh();
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save appointment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(mouseEvent) => mouseEvent.target === mouseEvent.currentTarget && onClose()}>
      <section className="modal-panel appointment-modal" role="dialog" aria-modal="true" aria-labelledby="appointment-title">
        <div className="panel-header">
          <div><p className="eyebrow">Calendar</p><h2 id="appointment-title">{event ? "Edit appointment" : "New appointment"}</h2></div>
          <button type="button" className="button button-secondary" onClick={onClose}>Close</button>
        </div>
        {!editable ? <p className="notice notice-warning">This is an older project schedule. Create an appointment to manage assignment and confirmations.</p> : null}
        <div className="form-grid two-column-grid">
          <label className="field-block"><span className="field-label">Record type</span><select className="select" value={parentType} disabled={!editable} onChange={(e) => { setParentType(e.target.value as "project" | "lead"); setParentId(""); }}><option value="project">Project work</option><option value="lead">Site visit / lead</option></select></label>
          <label className="field-block"><span className="field-label">{parentType === "project" ? "Project" : "Lead"}</span><select className="select" value={parentId} disabled={!editable} onChange={(e) => setParentId(e.target.value)}><option value="">Choose {parentType}</option>{(parentType === "project" ? projects : leads).map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}</select></label>
          <label className="field-block"><span className="field-label">Appointment type</span><select className="select" value={typeCode} disabled={!editable} onChange={(e) => setTypeCode(e.target.value)}>{appointmentTypes.map((type) => <option key={type.code} value={type.code}>{type.label}</option>)}</select></label>
          <label className="field-block"><span className="field-label">Assigned worker</span><select className="select" value={workerId} disabled={!editable} onChange={(e) => setWorkerId(e.target.value)}><option value="">Unassigned</option>{workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.display_name} — {worker.availability_status}</option>)}</select></label>
          <label className="field-block"><span className="field-label">Start</span><input className="input" type="datetime-local" value={startAt} disabled={!editable} onChange={(e) => setStartAt(e.target.value)} /></label>
          <label className="field-block"><span className="field-label">End</span><input className="input" type="datetime-local" value={endAt} disabled={!editable} onChange={(e) => setEndAt(e.target.value)} /></label>
          <label className="field-block"><span className="field-label">Status</span><select className="select" value={status} disabled={!editable} onChange={(e) => setStatus(e.target.value)}><option value="scheduled">Scheduled</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No show</option></select></label>
          <label className="field-block"><span className="field-label">Reschedule reason</span><input className="input" value={rescheduleReason} disabled={!editable} placeholder="Required when date or time changes" onChange={(e) => setRescheduleReason(e.target.value)} /></label>
          <label className="field-block"><span className="field-label">Customer confirmation</span><select className="select" value={customerConfirmation} disabled={!editable} onChange={(e) => setCustomerConfirmation(e.target.value)}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="declined">Declined</option></select></label>
          <label className="field-block"><span className="field-label">Worker confirmation</span><select className="select" value={workerConfirmation} disabled={!editable} onChange={(e) => setWorkerConfirmation(e.target.value)}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="declined">Declined</option></select></label>
        </div>
        {status === "cancelled" ? <label className="field-block"><span className="field-label">Cancellation reason</span><textarea className="textarea" value={cancellationReason} disabled={!editable} onChange={(e) => setCancellationReason(e.target.value)} /></label> : null}
        <label className="field-block"><span className="field-label">Notes</span><textarea className="textarea" value={notes} disabled={!editable} onChange={(e) => setNotes(e.target.value)} /></label>
        {message ? <p className="notice notice-error">{message}</p> : null}
        <div className="inline-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>{editable ? <button type="button" className="button button-primary" disabled={saving || !parentId} onClick={save}>{saving ? "Saving…" : "Save appointment"}</button> : null}</div>
      </section>
    </div>
  );
}
