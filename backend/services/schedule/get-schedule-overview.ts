import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getCalendarMonthKey } from "@/lib/utils/dates";
import { cachedQuery } from "@/lib/cache/query-cache";
import { CACHE_TAGS } from "@/lib/cache/cache-tags";

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

const getScheduleOverviewCached = cachedQuery(
  ["schedule", "overview"],
  async () => {
  const supabase = createAdminSupabaseClient();
  const [appointmentsResult, projectsResult, leadsResult, workersResult, typesResult] = await Promise.all([
    supabase.from("appointments").select(`
      *,
      appointment_types(code, label),
      profiles!appointments_assigned_profile_id_fkey(id, display_name, availability_status),
      projects(id, title, status_code),
      leads(id, title, status_code)
    `).order("scheduled_start_at", { ascending: true }),
    supabase.from("projects").select("id, title, status_code, scheduled_start_at, scheduled_end_at").order("created_at", { ascending: false }),
    supabase.from("leads").select("id, title, status_code").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, display_name, availability_status, availability_note").eq("role_code", "field_worker").eq("is_active", true).order("display_name"),
    supabase.from("appointment_types").select("code, label").eq("is_active", true).order("sort_order"),
  ]);
  for (const result of [appointmentsResult, projectsResult, leadsResult, workersResult, typesResult]) {
    if (result.error) throw result.error;
  }

  const appointments = appointmentsResult.data ?? [];
  const appointmentProjectIds = new Set(appointments.map((item) => item.project_id).filter(Boolean));
  type ScheduleEvent = {
    id: string; entityKind: "appointment" | "project"; projectId: string | null; leadId: string | null;
    title: string; typeCode: string; typeLabel: string; status: string; workerId: string | null;
    workerName: string | null; scheduledStartAt: string; scheduledEndAt: string | null; notes: string | null;
    cancellationReason: string | null; rescheduleReason: string | null; customerConfirmationStatus: string;
    workerConfirmationStatus: string;
  };
  const events: ScheduleEvent[] = appointments.map((appointment) => {
    const project = one(appointment.projects);
    const lead = one(appointment.leads);
    const worker = one(appointment.profiles);
    const appointmentType = one(appointment.appointment_types);
    return {
      id: appointment.id,
      entityKind: "appointment" as const,
      projectId: appointment.project_id,
      leadId: appointment.lead_id,
      title: project?.title ?? lead?.title ?? "Appointment",
      typeCode: appointment.appointment_type_code,
      typeLabel: appointmentType?.label ?? appointment.appointment_type_code,
      status: appointment.status_code,
      workerId: appointment.assigned_profile_id,
      workerName: worker?.display_name ?? null,
      scheduledStartAt: appointment.scheduled_start_at,
      scheduledEndAt: appointment.scheduled_end_at,
      notes: appointment.notes,
      cancellationReason: appointment.cancellation_reason,
      rescheduleReason: appointment.reschedule_reason,
      customerConfirmationStatus: appointment.customer_confirmation_status,
      workerConfirmationStatus: appointment.worker_confirmation_status,
    };
  });

  for (const project of projectsResult.data ?? []) {
    if (!project.scheduled_start_at || appointmentProjectIds.has(project.id)) continue;
    events.push({
      id: `legacy-${project.id}`,
      entityKind: "project" as const,
      projectId: project.id,
      leadId: null,
      title: project.title ?? "Project",
      typeCode: "work_execution",
      typeLabel: "Work Execution",
      status: project.status_code,
      workerId: null,
      workerName: null,
      scheduledStartAt: project.scheduled_start_at,
      scheduledEndAt: project.scheduled_end_at,
      notes: null,
      cancellationReason: null,
      rescheduleReason: null,
      customerConfirmationStatus: "pending",
      workerConfirmationStatus: "pending",
    });
  }

  events.sort((left, right) => new Date(left.scheduledStartAt).getTime() - new Date(right.scheduledStartAt).getTime());
  const today = new Date();
  const currentMonth = events.find((event) => getCalendarMonthKey(event.scheduledStartAt) === getCalendarMonthKey(today));
  const next = events.find((event) => new Date(event.scheduledStartAt).getTime() >= today.getTime());
  const baseDate = currentMonth ? today : next ? new Date(next.scheduledStartAt) : today;

  return {
    baseDate,
    events,
    projects: projectsResult.data ?? [],
    leads: leadsResult.data ?? [],
    workers: workersResult.data ?? [],
    appointmentTypes: typesResult.data ?? [],
  };
  },
  15,
  [CACHE_TAGS.schedule, CACHE_TAGS.projects, CACHE_TAGS.leads, CACHE_TAGS.profiles],
);

export async function getScheduleOverview() {
  return getScheduleOverviewCached();
}
