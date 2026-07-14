import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CircleAlert,
  Clock3,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import type { getDashboardOverview } from "@/backend/services/dashboard/get-dashboard-overview";
import type { getScheduleOverview } from "@/backend/services/schedule/get-schedule-overview";
import { EmptyState } from "@/frontend/components/dashboard/empty-state";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";
import {
  APP_LOCALE,
  APP_TIME_ZONE,
  formatLongDate,
  getCalendarDayKey,
} from "@/frontend/lib/format";

type DashboardOverview = Awaited<ReturnType<typeof getDashboardOverview>>;
type ScheduleOverview = Awaited<ReturnType<typeof getScheduleOverview>>;

const timeFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

function formatTime(value: string) {
  return timeFormatter.format(new Date(value));
}

function availabilityLabel(value: string) {
  const labels: Record<string, string> = {
    available: "Available",
    working: "On a job",
    arrived: "On site",
    on_the_way: "Travelling",
    leave: "On leave",
    unavailable: "Unavailable",
    inactive: "Inactive",
  };

  return labels[value] ?? value.replaceAll("_", " ");
}

export function CoordinatorDashboard({
  displayName,
  dashboard,
  schedule,
}: {
  displayName: string;
  dashboard: DashboardOverview;
  schedule: ScheduleOverview;
}) {
  const today = new Date();
  const todayKey = getCalendarDayKey(today);
  const todayEvents = schedule.events.filter(
    (event) => getCalendarDayKey(event.scheduledStartAt) === todayKey,
  );
  const allUpcomingEvents = schedule.events
    .filter(
      (event) =>
        new Date(event.scheduledStartAt).getTime() >= today.getTime() &&
        !["cancelled", "completed"].includes(event.status),
    )
  const upcomingEvents = allUpcomingEvents.slice(0, 6);
  const unassignedCount = allUpcomingEvents.filter((event) => !event.workerId).length;
  const availableCount = schedule.workers.filter((worker) =>
    ["available", "active"].includes(worker.availability_status),
  ).length;
  const projectActions = dashboard.needsAction
    .filter((item) => item.type === "project")
    .slice(0, 5);

  return (
    <div className="page-stack coordinator-page">
      <section className="coordinator-hero">
        <div>
          <p className="coordinator-kicker">Operations desk · {formatLongDate(today)}</p>
          <h1>Good day, {displayName.split(" ")[0]}.</h1>
          <p>Keep the team moving, catch exceptions early, and make every handoff clear.</p>
        </div>
        <div className="coordinator-hero-actions">
          <Link className="button coordinator-button-light" href="/schedule">
            <CalendarClock size={17} aria-hidden="true" /> Open schedule
          </Link>
          <Link className="button coordinator-button-ghost" href="/projects">
            View all jobs <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="coordinator-pulse" aria-label="Today's operations summary">
        <article>
          <span className="coordinator-pulse-icon is-blue"><CalendarClock size={19} /></span>
          <div><strong>{todayEvents.length}</strong><span>Visits today</span></div>
        </article>
        <article>
          <span className={`coordinator-pulse-icon ${unassignedCount ? "is-amber" : "is-green"}`}><CircleAlert size={19} /></span>
          <div><strong>{unassignedCount}</strong><span>Need a worker</span></div>
        </article>
        <article>
          <span className="coordinator-pulse-icon is-green"><UserRoundCheck size={19} /></span>
          <div><strong>{availableCount}</strong><span>Available now</span></div>
        </article>
        <article>
          <span className="coordinator-pulse-icon is-violet"><BriefcaseBusiness size={19} /></span>
          <div><strong>{dashboard.stats.activeProjects}</strong><span>Active jobs</span></div>
        </article>
      </section>

      <div className="coordinator-workspace">
        <section className="panel coordinator-run-sheet">
          <div className="coordinator-section-heading">
            <div>
              <p className="eyebrow">Live run sheet</p>
              <h2>{todayEvents.length ? "Today’s visits" : "Next on the schedule"}</h2>
            </div>
            <Link href="/schedule">Full calendar <ArrowRight size={15} /></Link>
          </div>

          {(todayEvents.length ? todayEvents : upcomingEvents).length === 0 ? (
            <EmptyState
              title="The schedule is clear"
              description="New visits and work appointments will appear here as they are booked."
            />
          ) : (
            <div className="coordinator-timeline">
              {(todayEvents.length ? todayEvents : upcomingEvents).map((event) => (
                <Link
                  href={event.projectId ? `/projects/${event.projectId}` : "/schedule"}
                  className="coordinator-visit"
                  key={event.id}
                >
                  <time>{formatTime(event.scheduledStartAt)}</time>
                  <span className="coordinator-timeline-dot" aria-hidden="true" />
                  <div className="coordinator-visit-main">
                    <div>
                      <strong>{event.title}</strong>
                      <StatusBadge status={event.status} />
                    </div>
                    <p>
                      <UsersRound size={15} aria-hidden="true" />
                      {event.workerName ?? "Worker not assigned"}
                    </p>
                    <span>{event.typeLabel}</span>
                  </div>
                  <ArrowRight className="coordinator-row-arrow" size={17} aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="panel coordinator-team-panel">
          <div className="coordinator-section-heading">
            <div>
              <p className="eyebrow">Field team</p>
              <h2>Who can take work</h2>
            </div>
          </div>
          {schedule.workers.length === 0 ? (
            <p className="coordinator-empty-copy">No active field workers have been added yet.</p>
          ) : (
            <div className="coordinator-team-list">
              {schedule.workers.map((worker) => (
                <div className="coordinator-team-member" key={worker.id}>
                  <span className="coordinator-avatar">
                    {worker.display_name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                  </span>
                  <div><strong>{worker.display_name}</strong><span>{availabilityLabel(worker.availability_status)}</span></div>
                  <span className={`coordinator-availability is-${worker.availability_status}`} aria-label={availabilityLabel(worker.availability_status)} />
                </div>
              ))}
            </div>
          )}
          <Link className="coordinator-panel-link" href="/schedule">
            Manage assignments <ArrowRight size={15} />
          </Link>
        </aside>
      </div>

      <section className="panel coordinator-attention-panel">
        <div className="coordinator-section-heading">
          <div>
            <p className="eyebrow">Keep things moving</p>
            <h2>Needs your attention</h2>
          </div>
          <Link href="/projects">All jobs <ArrowRight size={15} /></Link>
        </div>
        {projectActions.length === 0 ? (
          <div className="coordinator-all-clear">
            <UserRoundCheck size={20} aria-hidden="true" />
            <div><strong>Everything is moving</strong><span>No active job needs an immediate handoff.</span></div>
          </div>
        ) : (
          <div className="coordinator-attention-list">
            {projectActions.map((item) => (
              <Link href={item.href} key={item.id}>
                <span className="coordinator-attention-icon"><Clock3 size={17} /></span>
                <div><strong>{item.title}</strong><span>{item.finalValue}</span></div>
                <StatusBadge status={item.status} />
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
