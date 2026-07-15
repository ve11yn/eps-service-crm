import { CheckCircle2 } from "lucide-react";
import { getWorkerWorkspace } from "@/backend/services/projects/get-worker-workspace";
import { EmptyState } from "@/frontend/components/dashboard/empty-state";
import { Sidebar } from "@/frontend/components/dashboard/sidebar";
import { StatCard } from "@/frontend/components/dashboard/stat-card";
import { WorkerFieldCard } from "@/frontend/components/worker/worker-field-card";
import { formatLongDate, getCalendarDayKey } from "@/frontend/lib/format";
import { requireAppSession } from "@/lib/auth/session";

export default async function WorkerPage() {
  const session = await requireAppSession([
    "owner",
    "admin",
    "coordinator",
    "field_worker",
  ]);
  const items = await getWorkerWorkspace(session.profile.id);
  const today = new Date();
  const todayKey = getCalendarDayKey(today);
  const getScheduledAt = (item: (typeof items)[number]) =>
    item.scheduledStartAt ?? item.project?.scheduledStartAt ?? null;
  const todayItems = items.filter(
    (item) => getCalendarDayKey(getScheduledAt(item)) === todayKey,
  );
  const otherItems = items.filter(
    (item) => getCalendarDayKey(getScheduledAt(item)) !== todayKey,
  );
  const evidenceOutstanding = items.filter((item) => {
    if (!item.beforeAfterRequired) return false;
    const types = new Set(item.evidence.map((asset) => asset.evidenceType));
    return !types.has("before") || !types.has("after");
  }).length;

  return (
    <div className="dashboard-shell">
      <Sidebar
        displayName={session.profile.displayName}
        roleLabel="Field Worker"
        roleCode="field_worker"
      />

      <main className="dashboard-main">
        <div className="page-stack worker-dashboard-page">
          <section className="page-header worker-page-header">
            <div>
              <p className="eyebrow">Field operations · {formatLongDate(today)}</p>
              <h1>Scheduled Tasks</h1>
              <p className="page-header-copy">
                Welcome back, {session.profile.displayName.split(" ")[0]}. Review your assigned jobs and send updates from site.
              </p>
            </div>
          </section>

          <div className="worker-dashboard-scroll">
            <section className="stats-grid worker-dashboard-stats" aria-label="Work summary">
              <StatCard
                label="Assigned Items"
                value={items.length}
                hint="Open work currently assigned to you"
              />
              <StatCard
                label="Scheduled Today"
                value={todayItems.length}
                hint="Items on today’s route"
              />
              <StatCard
                label="Evidence Due"
                value={evidenceOutstanding}
                hint="Jobs still needing before or after photos"
              />
            </section>

            {items.length === 0 ? (
              <section className="panel worker-dashboard-empty">
                <span className="worker-empty-icon"><CheckCircle2 size={28} /></span>
                <EmptyState
                  title="You’re all caught up"
                  description="There are no open jobs assigned to you right now. New work will appear here when the coordinator schedules it."
                />
              </section>
            ) : (
              <div className="worker-work-sections">
                {todayItems.length > 0 ? (
                  <section className="worker-work-section">
                    <div className="worker-section-heading">
                      <h2>Today’s tasks</h2>
                      <span>{todayItems.length} {todayItems.length === 1 ? "job" : "jobs"}</span>
                    </div>
                    <div className="worker-job-list">
                      {todayItems.map((item, index) => (
                        <WorkerFieldCard key={item.id} item={item} sequence={index + 1} defaultExpanded={index === 0} />
                      ))}
                    </div>
                  </section>
                ) : null}

                {otherItems.length > 0 ? (
                  <section className="worker-work-section">
                    <div className="worker-section-heading">
                      <h2>{todayItems.length ? "Upcoming tasks" : "Assigned tasks"}</h2>
                      <span>{otherItems.length} {otherItems.length === 1 ? "job" : "jobs"}</span>
                    </div>
                    <div className="worker-job-list">
                      {otherItems.map((item, index) => (
                        <WorkerFieldCard
                          key={item.id}
                          item={item}
                          sequence={index + 1}
                          defaultExpanded={todayItems.length === 0 && index === 0}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
