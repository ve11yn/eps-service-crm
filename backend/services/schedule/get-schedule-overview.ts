import "server-only";

import { listProjects } from "@/backend/repositories";

export async function getScheduleOverview() {
  const projects = await listProjects();
  const scheduledProjects = projects.filter((project) => project.scheduled_start_at);

  const baseDate =
    scheduledProjects.length > 0
      ? new Date(scheduledProjects[0].scheduled_start_at as string)
      : new Date();

  return {
    baseDate,
    events: scheduledProjects.map((project) => ({
      id: project.id,
      title: project.title,
      status: project.status_code,
      scheduledStartAt: project.scheduled_start_at,
      scheduledEndAt: project.scheduled_end_at,
    })),
  };
}
