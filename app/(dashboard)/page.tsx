import Link from "next/link";
import { getDashboardOverview } from "@/backend/services/dashboard/get-dashboard-overview";
import { StatCard } from "@/frontend/components/dashboard/stat-card";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";
import { EmptyState } from "@/frontend/components/dashboard/empty-state";
import { formatDateTime } from "@/frontend/lib/format";
import { requireAppSession } from "@/lib/auth/session";

export default async function HomePage() {
  const session = await requireAppSession(["owner", "admin"]);
  const dashboard = await getDashboardOverview();

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">EPS Services</p>
          <h1>Good Morning, {session.profile.displayName}</h1>
        </div>
        <p className="page-header-copy">
          Your dashboard prioritizes incoming chat reviews, active projects, and today&apos;s schedule.
        </p>
      </section>

      <section className="stats-grid">
        <StatCard label="To Review" value={dashboard.stats.toReview} hint="New WhatsApp extractions waiting for approval" />
        <StatCard label="Active Projects" value={dashboard.stats.activeProjects} hint="Scheduled, ongoing, QA, and invoiced" />
        <StatCard label="Completed" value={dashboard.stats.completedProjects} hint="Closed projects already marked done" />
        <StatCard label="Scheduled Today" value={dashboard.stats.scheduledToday} hint="Projects with work starting today" />
      </section>

      <section className="panel table-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Operations</p>
            <h2>Needs Action</h2>
          </div>
          <Link className="button button-secondary" href="/inbox">
            Open Inbox
          </Link>
        </div>

        {dashboard.needsAction.length === 0 ? (
          <EmptyState
            title="No urgent actions right now"
            description="Once review drafts or active projects need attention, they will show here."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Next Action</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.needsAction.map((item) => (
                  <tr key={`${item.type}-${item.id}`}>
                    <td>
                      <Link
                        href={
                          item.type === "review"
                            ? `/reviews/${item.id}`
                            : `/projects/${item.id}`
                        }
                        className="table-link"
                      >
                        {item.title}
                      </Link>
                    </td>
                    <td>{formatDateTime(item.dueAt)}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>{item.nextAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
