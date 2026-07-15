import { CheckCircle2 } from "lucide-react";
import { getWorkerWorkspace } from "@/backend/services/projects/get-worker-workspace";
import { EmptyState } from "@/frontend/components/dashboard/empty-state";
import { Sidebar } from "@/frontend/components/dashboard/sidebar";
import { StatCard } from "@/frontend/components/dashboard/stat-card";
import { WorkerDateNavigator } from "@/frontend/components/worker/worker-date-navigator";
import { WorkerFieldCard } from "@/frontend/components/worker/worker-field-card";
import { formatLongDate, getCalendarDate, getCalendarDayKey } from "@/frontend/lib/format";
import { requireAppSession } from "@/lib/auth/session";

export default async function WorkerPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const session = await requireAppSession([
    "owner",
    "admin",
    "coordinator",
    "field_worker",
  ]);
  const params = await searchParams;
  const items = await getWorkerWorkspace(session.profile.id);
  const today = new Date();
  const todayKey = getCalendarDayKey(today);
  const requestedDate = Array.isArray(params.date) ? params.date[0] : params.date;
  const requestedCalendarDate = requestedDate ? getCalendarDate(requestedDate) : null;
  const selectedDate = requestedCalendarDate && getCalendarDayKey(requestedCalendarDate) === requestedDate
    ? requestedCalendarDate
    : getCalendarDate(today) ?? today;
  const selectedDateKey = getCalendarDayKey(selectedDate);
  const getScheduledAt = (item: (typeof items)[number]) =>
    item.scheduledStartAt ?? item.project?.scheduledStartAt ?? null;
  const getPriorityRank = (priority: string) => {
    const normalized = priority.toLowerCase().replaceAll("_", " ");
    if (normalized.includes("urgent")) return 4;
    if (normalized.includes("high")) return 3;
    if (normalized.includes("low")) return 1;
    return 2;
  };
  const compareTasks = (left: (typeof items)[number], right: (typeof items)[number]) => {
    const priorityDifference = getPriorityRank(right.priorityCode) - getPriorityRank(left.priorityCode);
    if (priorityDifference !== 0) return priorityDifference;
    return new Date(getScheduledAt(left) ?? 0).getTime() - new Date(getScheduledAt(right) ?? 0).getTime();
  };
  const selectedItems = items
    .filter((item) => getCalendarDayKey(getScheduledAt(item)) === selectedDateKey)
    .sort(compareTasks);
  const unscheduledItems = items
    .filter((item) => !getScheduledAt(item))
    .sort(compareTasks);
  const workDateCounts = new Map<string, number>();
  items.forEach((item) => {
    const dateKey = getCalendarDayKey(getScheduledAt(item));
    if (dateKey) workDateCounts.set(dateKey, (workDateCounts.get(dateKey) ?? 0) + 1);
  });
  const workDates = Array.from(workDateCounts, ([date, count]) => ({ date, count }))
    .sort((left, right) => left.date.localeCompare(right.date));
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
            <WorkerDateNavigator selectedDate={selectedDateKey} today={todayKey} workDates={workDates} />

            <section className="stats-grid worker-dashboard-stats" aria-label="Work summary">
              <StatCard
                label="Assigned Items"
                value={items.length}
                hint="Open work currently assigned to you"
              />
              <StatCard
                label={selectedDateKey === todayKey ? "Scheduled Today" : "Selected Date"}
                value={selectedItems.length}
                hint={selectedDateKey === todayKey ? "Items on today’s route" : formatLongDate(selectedDate)}
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
                {selectedItems.length > 0 ? (
                  <section className="worker-work-section">
                    <div className="worker-section-heading">
                      <div>
                        <p className="eyebrow">{formatLongDate(selectedDate)}</p>
                        <h2>{selectedDateKey === todayKey ? "Today’s tasks" : "Scheduled tasks"}</h2>
                      </div>
                      <span>{selectedItems.length} {selectedItems.length === 1 ? "job" : "jobs"}</span>
                    </div>
                    <div className="worker-job-list">
                      {selectedItems.map((item, index) => (
                        <WorkerFieldCard key={item.id} item={item} sequence={index + 1} defaultExpanded={index === 0} />
                      ))}
                    </div>
                  </section>
                ) : (
                  <section className="panel worker-date-empty">
                    <span className="worker-empty-icon"><CheckCircle2 size={24} /></span>
                    <EmptyState
                      title="No work scheduled for this date"
                      description="Choose another work date above to see your assigned tasks."
                    />
                  </section>
                )}

                {unscheduledItems.length > 0 ? (
                  <section className="worker-work-section">
                    <div className="worker-section-heading">
                      <div>
                        <p className="eyebrow">No date assigned</p>
                        <h2>Awaiting schedule</h2>
                      </div>
                      <span>{unscheduledItems.length} {unscheduledItems.length === 1 ? "job" : "jobs"}</span>
                    </div>
                    <div className="worker-job-list">
                      {unscheduledItems.map((item, index) => (
                        <WorkerFieldCard
                          key={item.id}
                          item={item}
                          sequence={index + 1}
                          defaultExpanded={selectedItems.length === 0 && index === 0}
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
