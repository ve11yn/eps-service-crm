import Link from "next/link";
import { getDashboardOverview } from "@/backend/services/dashboard/get-dashboard-overview";
import { StatCard } from "@/frontend/components/dashboard/stat-card";
import { EmptyState } from "@/frontend/components/dashboard/empty-state";
import { ActionQueueItem } from "@/frontend/components/dashboard/action-queue-item";
import { requireAppSession } from "@/lib/auth/session";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";
import { formatDateTime, formatMoney, getCalendarDate, getCalendarDayKey } from "@/frontend/lib/format";
import { getScheduleOverview } from "@/backend/services/schedule/get-schedule-overview";
import { getCoordinatorWorkspace } from "@/backend/services/projects/get-coordinator-workspace";
import { CoordinatorTaskWorkspace } from "@/frontend/components/dashboard/coordinator-task-workspace";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const session = await requireAppSession(["owner", "admin", "coordinator"]);

  if (session.profile.roleCode === "coordinator") {
    const params = await searchParams;
    const [items, schedule] = await Promise.all([
      getCoordinatorWorkspace(),
      getScheduleOverview(),
    ]);
    const today = new Date();
    const requestedDate = Array.isArray(params.date) ? params.date[0] : params.date;
    const requestedCalendarDate = requestedDate ? getCalendarDate(requestedDate) : null;
    const selectedDate = requestedCalendarDate && getCalendarDayKey(requestedCalendarDate) === requestedDate
      ? requestedCalendarDate
      : getCalendarDate(today) ?? today;

    return (
      <CoordinatorTaskWorkspace
        displayName={session.profile.displayName}
        items={items}
        workers={schedule.workers.map((worker) => ({ id: worker.id, displayName: worker.display_name }))}
        selectedDate={selectedDate}
        today={today}
      />
    );
  }

  const dashboard = await getDashboardOverview();

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <h1>Dashboard</h1>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          label="To Review"
          value={dashboard.stats.toReview}
        />
        <StatCard
          label="Active Projects"
          value={dashboard.stats.activeProjects}
        />
        <StatCard
          label="Completed"
          value={dashboard.stats.completedProjects}
        />
        <StatCard
          label="Scheduled Today"
          value={dashboard.stats.scheduledToday}
        />
      </section>

      <section className="panel table-panel">
        <div className="panel-header">
          <div>
            <h2>Recent Projects</h2>
          </div>
          <Link className="button button-secondary" href="/projects">View Projects</Link>
        </div>
        {dashboard.recentProjects.length === 0 ? (
          <EmptyState title="No projects yet" description="Approved jobs will appear here." />
        ) : (
          <div className="review-draft-list">
            <div className="review-draft-list-head" aria-hidden="true">
              <span>Project</span><span>Customer</span><span>Status</span><span>Updated</span><span>Value</span>
            </div>
            {dashboard.recentProjects.map((project) => {
              const contact = Array.isArray(project.contacts) ? project.contacts[0] : project.contacts;
              const total = (project.invoices ?? []).reduce((sum, invoice) => sum + Number(invoice.total_amount), 0);
              return <Link className="review-draft-row" href={`/projects/${project.id}`} key={project.id}>
                <span><strong>{project.title}</strong><small>{project.project_code}</small></span>
                <span>{contact?.full_name ?? "Customer"}</span>
                <StatusBadge status={project.status_code} />
                <span>{formatDateTime(project.completed_at ?? project.updated_at)}</span>
                <strong>{formatMoney(total)}</strong>
              </Link>;
            })}
          </div>
        )}
      </section>

      <section className="panel table-panel">
        <div className="panel-header panel-header-no-wrap">
          <div>
            <h2>Need Action</h2>
          </div>
          <div className="inline-actions">
            <Link className="button button-secondary" href="/requests">
              View All Requests
            </Link>
            {/* <Link className="button button-secondary" href="/inbox">
              Open Inbox
            </Link> */}
          </div>
        </div>

        {dashboard.needsAction.length === 0 ? (
          <EmptyState
            title="No urgent actions right now"
            description="Once review drafts or active projects need attention, they will show here."
          />
        ) : (
          <div className="review-draft-list">
            <div className="review-draft-list-head" aria-hidden="true">
              <span>Item</span>
              <span>Queue</span>
              <span>Status</span>
              <span>Updated</span>
              <span>Next Action</span>
            </div>

            {dashboard.needsAction.map((item) => (
              <ActionQueueItem
                key={`${item.type}-${item.id}`}
                href={item.href}
                title={item.title}
                subtitle={item.subtitle}
                contextLabel={item.contextLabel}
                contextValue={item.contextValue}
                status={item.status}
                updatedAt={item.dueAt}
                finalValue={item.finalValue}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
