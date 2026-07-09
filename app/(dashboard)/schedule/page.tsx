import { getScheduleOverview } from "@/backend/services/schedule/get-schedule-overview";
import { ScheduleCalendar } from "@/frontend/components/dashboard/schedule-calendar";
import { requireAppSession } from "@/lib/auth/session";

export default async function SchedulePage() {
  await requireAppSession(["owner", "admin", "coordinator"]);
  const schedule = await getScheduleOverview();

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <h1>Calendar</h1>
        </div>
      </section>

      <section className="panel schedule-panel">
        <ScheduleCalendar
          baseDate={schedule.baseDate.toISOString()}
          events={schedule.events}
        />
      </section>
    </div>
  );
}
