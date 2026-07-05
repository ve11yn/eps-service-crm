import { getScheduleOverview } from "@/backend/services/schedule/get-schedule-overview";
import { ScheduleCalendar } from "@/frontend/components/dashboard/schedule-calendar";

export default async function SchedulePage() {
  const schedule = await getScheduleOverview();

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Planning</p>
          <h1>Schedule</h1>
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
