import "server-only";

import { listProjects } from "@/backend/repositories";
import { getCalendarMonthKey } from "@/lib/utils/dates";

export async function getScheduleOverview() {
  const projects = await listProjects();
  const scheduledProjects = projects
    .filter((project) => project.scheduled_start_at)
    .sort((left, right) => {
      const leftTime = new Date(left.scheduled_start_at as string).getTime();
      const rightTime = new Date(right.scheduled_start_at as string).getTime();
      return leftTime - rightTime;
    });

  const today = new Date();
  const currentMonthKey = getCalendarMonthKey(today);
  const currentMonthProject = scheduledProjects.find((project) => {
    return getCalendarMonthKey(project.scheduled_start_at as string) === currentMonthKey;
  });

  const upcomingProject = scheduledProjects.find((project) => {
    const scheduledDate = new Date(project.scheduled_start_at as string);
    return scheduledDate.getTime() >= today.getTime();
  });

  const fallbackProject = scheduledProjects[scheduledProjects.length - 1];

  const baseDate = currentMonthProject
    ? today
    : upcomingProject
      ? new Date(upcomingProject.scheduled_start_at as string)
      : fallbackProject
        ? new Date(fallbackProject.scheduled_start_at as string)
        : today;

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
