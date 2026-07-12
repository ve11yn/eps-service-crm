import "server-only";

import { logAuditEvent } from "@/backend/observability/audit";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type ConfirmationStatus = "pending" | "confirmed" | "declined";

export type AppointmentInput = {
  appointmentTypeCode: string;
  leadId?: string | null;
  projectId?: string | null;
  assignedProfileId?: string | null;
  scheduledStartAt: string;
  scheduledEndAt: string;
  statusCode?: string;
  notes?: string | null;
  cancellationReason?: string | null;
  rescheduleReason?: string | null;
  customerConfirmationStatus?: ConfirmationStatus;
  workerConfirmationStatus?: ConfirmationStatus;
};

const activeStatuses = ["scheduled", "confirmed"];

function validateInput(input: AppointmentInput, previous?: { scheduled_start_at: string; scheduled_end_at: string | null; status_code: string }) {
  if (Boolean(input.leadId) === Boolean(input.projectId)) {
    throw new Error("Choose one linked lead or one linked project.");
  }
  const start = new Date(input.scheduledStartAt);
  const end = new Date(input.scheduledEndAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new Error("Appointment end time must be after its start time.");
  }
  const status = input.statusCode ?? "scheduled";
  if (status === "cancelled" && !input.cancellationReason?.trim()) {
    throw new Error("A cancellation reason is required.");
  }
  const moved = previous && (
    previous.scheduled_start_at !== input.scheduledStartAt ||
    previous.scheduled_end_at !== input.scheduledEndAt
  );
  if (moved && !input.rescheduleReason?.trim()) {
    throw new Error("A reschedule reason is required when changing the date or time.");
  }
}

async function enforceWorkerAvailability(input: AppointmentInput, excludeAppointmentId?: string) {
  if (!input.assignedProfileId || !activeStatuses.includes(input.statusCode ?? "scheduled")) return;
  const supabase = createAdminSupabaseClient();
  const { data: worker, error: workerError } = await supabase
    .from("profiles")
    .select("id, display_name, availability_status, is_active, role_code")
    .eq("id", input.assignedProfileId)
    .single();
  if (workerError) throw workerError;
  if (!worker.is_active || worker.role_code !== "field_worker") {
    throw new Error("Choose an active field worker.");
  }
  if (["unavailable", "leave"].includes(worker.availability_status)) {
    throw new Error(`${worker.display_name} is marked ${worker.availability_status}. Update availability before assigning this appointment.`);
  }

  let conflictQuery = supabase
    .from("appointments")
    .select("id, scheduled_start_at, scheduled_end_at")
    .eq("assigned_profile_id", input.assignedProfileId)
    .in("status_code", activeStatuses)
    .lt("scheduled_start_at", input.scheduledEndAt)
    .gt("scheduled_end_at", input.scheduledStartAt)
    .limit(1);
  if (excludeAppointmentId) conflictQuery = conflictQuery.neq("id", excludeAppointmentId);
  const { data: conflicts, error: conflictError } = await conflictQuery;
  if (conflictError) throw conflictError;
  if (conflicts?.length) {
    throw new Error(`${worker.display_name} already has another appointment during this time.`);
  }
}

function confirmationTimestamp(status: ConfirmationStatus | undefined, previous: string | null = null) {
  if (status === "confirmed") return previous ?? new Date().toISOString();
  return null;
}

async function syncProjectSchedule(projectId: string | null | undefined, input: AppointmentInput) {
  if (!projectId || input.appointmentTypeCode !== "work_execution") return;
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("projects").update({
    scheduled_start_at: input.scheduledStartAt,
    scheduled_end_at: input.scheduledEndAt,
  }).eq("id", projectId);
  if (error) throw error;
}

export async function createAppointment(input: AppointmentInput & { performedByProfileId: string }) {
  validateInput(input);
  await enforceWorkerAvailability(input);
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("appointments").insert({
    appointment_type_code: input.appointmentTypeCode,
    lead_id: input.leadId ?? null,
    project_id: input.projectId ?? null,
    assigned_profile_id: input.assignedProfileId ?? null,
    scheduled_start_at: input.scheduledStartAt,
    scheduled_end_at: input.scheduledEndAt,
    status_code: input.statusCode ?? "scheduled",
    notes: input.notes?.trim() || null,
    cancellation_reason: input.cancellationReason?.trim() || null,
    reschedule_reason: input.rescheduleReason?.trim() || null,
    customer_confirmation_status: input.customerConfirmationStatus ?? "pending",
    customer_confirmed_at: confirmationTimestamp(input.customerConfirmationStatus),
    worker_confirmation_status: input.workerConfirmationStatus ?? "pending",
    worker_confirmed_at: confirmationTimestamp(input.workerConfirmationStatus),
    created_by_profile_id: input.performedByProfileId,
  }).select("*").single();
  if (error) throw error;
  await syncProjectSchedule(input.projectId, input);
  await logAuditEvent({
    action: "schedule.appointment.create",
    entityType: "appointment",
    entityId: data.id,
    performedByProfileId: input.performedByProfileId,
    newValue: data,
  });
  return data;
}

export async function updateAppointment(id: string, input: AppointmentInput & { performedByProfileId: string }) {
  const supabase = createAdminSupabaseClient();
  const { data: before, error: findError } = await supabase.from("appointments").select("*").eq("id", id).single();
  if (findError) throw findError;
  validateInput(input, before);
  await enforceWorkerAvailability(input, id);
  const customerStatus = input.customerConfirmationStatus ?? before.customer_confirmation_status as ConfirmationStatus;
  const workerStatus = input.workerConfirmationStatus ?? before.worker_confirmation_status as ConfirmationStatus;
  const { data, error } = await supabase.from("appointments").update({
    appointment_type_code: input.appointmentTypeCode,
    lead_id: input.leadId ?? null,
    project_id: input.projectId ?? null,
    assigned_profile_id: input.assignedProfileId ?? null,
    scheduled_start_at: input.scheduledStartAt,
    scheduled_end_at: input.scheduledEndAt,
    status_code: input.statusCode ?? before.status_code,
    notes: input.notes?.trim() || null,
    cancellation_reason: input.cancellationReason?.trim() || null,
    reschedule_reason: input.rescheduleReason?.trim() || null,
    customer_confirmation_status: customerStatus,
    customer_confirmed_at: confirmationTimestamp(customerStatus, before.customer_confirmed_at),
    worker_confirmation_status: workerStatus,
    worker_confirmed_at: confirmationTimestamp(workerStatus, before.worker_confirmed_at),
    completed_at: input.statusCode === "completed" ? before.completed_at ?? new Date().toISOString() : null,
  }).eq("id", id).select("*").single();
  if (error) throw error;
  await syncProjectSchedule(input.projectId, input);
  await logAuditEvent({
    action: input.statusCode === "cancelled" ? "schedule.appointment.cancel" : "schedule.appointment.update",
    entityType: "appointment",
    entityId: id,
    performedByProfileId: input.performedByProfileId,
    oldValue: before,
    newValue: data,
  });
  return data;
}
