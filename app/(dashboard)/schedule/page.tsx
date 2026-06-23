import Link from "next/link";
import { getScheduleOverview } from "@/backend/services/schedule/get-schedule-overview";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";
import { buildMonthGrid, formatMonthTitle, isSameDay } from "@/frontend/lib/format";

export default async function SchedulePage() {
  const schedule = await getScheduleOverview();
  const monthGrid = buildMonthGrid(schedule.baseDate);

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Planning</p>
          <h1>Schedule</h1>
        </div>
        <p className="page-header-copy">Project start dates are shown on the calendar. Click any event to open the project.</p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>{formatMonthTitle(schedule.baseDate)}</h2>
        </div>

        <div className="calendar-grid">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
            <div key={label} className="calendar-heading">
              {label}
            </div>
          ))}

          {monthGrid.map((date) => {
            const events = schedule.events.filter((event) =>
              event.scheduledStartAt
                ? isSameDay(new Date(event.scheduledStartAt), date)
                : false,
            );

            return (
              <div key={date.toISOString()} className="calendar-cell">
                <span className="calendar-date">{date.getDate()}</span>
                <div className="calendar-events">
                  {events.map((event) => (
                    <Link
                      key={event.id}
                      href={`/projects/${event.id}`}
                      className="calendar-event"
                    >
                      <span>{event.title}</span>
                      <StatusBadge status={event.status} />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
