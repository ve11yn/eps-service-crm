import { CheckCircle2 } from "lucide-react";
import type { CoordinatorWorkspaceItem } from "@/backend/services/projects/get-coordinator-workspace";
import { CoordinatorTaskCard } from "@/frontend/components/dashboard/coordinator-task-card";
import { EmptyState } from "@/frontend/components/dashboard/empty-state";
import { StatCard } from "@/frontend/components/dashboard/stat-card";
import { WorkerDateNavigator } from "@/frontend/components/worker/worker-date-navigator";
import { formatLongDate, getCalendarDayKey } from "@/frontend/lib/format";

function priorityRank(priority: string) {
  const normalized = priority.toLowerCase().replaceAll("_", " ");
  if (normalized.includes("urgent")) return 4;
  if (normalized.includes("high")) return 3;
  if (normalized.includes("low")) return 1;
  return 2;
}

export function CoordinatorTaskWorkspace({
  displayName,
  items,
  workers,
  selectedDate,
  today,
}: {
  displayName: string;
  items: CoordinatorWorkspaceItem[];
  workers: Array<{ id: string; displayName: string }>;
  selectedDate: Date;
  today: Date;
}) {
  const selectedDateKey = getCalendarDayKey(selectedDate);
  const todayKey = getCalendarDayKey(today);
  const getScheduledAt = (item: CoordinatorWorkspaceItem) => item.scheduledStartAt;
  const getScheduledDayKey = (item: CoordinatorWorkspaceItem) => {
    const scheduledAt = getScheduledAt(item);
    return scheduledAt ? getCalendarDayKey(scheduledAt) : "";
  };
  const compareTasks = (left: CoordinatorWorkspaceItem, right: CoordinatorWorkspaceItem) => {
    const priorityDifference = priorityRank(right.priorityCode) - priorityRank(left.priorityCode);
    if (priorityDifference !== 0) return priorityDifference;
    return new Date(getScheduledAt(left) ?? 0).getTime() - new Date(getScheduledAt(right) ?? 0).getTime();
  };
  const selectedItems = items
    .filter((item) => getScheduledDayKey(item) === selectedDateKey)
    .sort(compareTasks);
  const unassignedItems = items
    .filter((item) => !item.assignedProfile)
    .sort(compareTasks);
  const selectedAssignedItems = selectedItems
    .filter((item) => item.assignedProfile)
    .sort(compareTasks);
  const unscheduledAssignedItems = items
    .filter((item) => item.assignedProfile && !getScheduledAt(item))
    .sort(compareTasks);
  const workDateCounts = new Map<string, number>();
  items.forEach((item) => {
    const dateKey = getScheduledDayKey(item);
    if (dateKey) workDateCounts.set(dateKey, (workDateCounts.get(dateKey) ?? 0) + 1);
  });
  const workDates = Array.from(workDateCounts, ([date, count]) => ({ date, count }))
    .sort((left, right) => left.date.localeCompare(right.date));
  const unassignedCount = unassignedItems.length;

  return (
    <div className="page-stack worker-dashboard-page coordinator-task-workspace">
      <section className="page-header worker-page-header">
        <div>
          <p className="eyebrow">Coordination desk · {formatLongDate(today)}</p>
          <h1>Team Tasks</h1>
          <p className="page-header-copy">
            Welcome back, {displayName.split(" ")[0]}. Assign field workers, confirm dates, and keep the daily schedule moving.
          </p>
        </div>
      </section>

      <div className="worker-dashboard-scroll">
        <WorkerDateNavigator selectedDate={selectedDateKey} today={todayKey} workDates={workDates} basePath="/" />

        <section className="stats-grid worker-dashboard-stats" aria-label="Coordination summary">
          <StatCard label="Open Tasks" value={items.length} hint="Pending and active field tasks" />
          <StatCard
            label={selectedDateKey === todayKey ? "Scheduled Today" : "Selected Date"}
            value={selectedItems.length}
            hint={selectedDateKey === todayKey ? "Tasks planned for today" : formatLongDate(selectedDate)}
          />
          <StatCard label="Need a Worker" value={unassignedCount} hint="Tasks still waiting for assignment" />
        </section>

        {items.length === 0 ? (
          <section className="panel worker-dashboard-empty">
            <span className="worker-empty-icon"><CheckCircle2 size={28} /></span>
            <EmptyState title="The task board is clear" description="New project tasks will appear here when work is ready to schedule." />
          </section>
        ) : (
          <div className="worker-work-sections">
            {unassignedItems.length > 0 ? (
              <section className="worker-work-section coordinator-needs-assignment">
                <div className="worker-section-heading">
                  <div>
                    <p className="eyebrow">Action required</p>
                    <h2>Needs assignment</h2>
                  </div>
                  <span>{unassignedItems.length} {unassignedItems.length === 1 ? "task" : "tasks"}</span>
                </div>
                <div className="worker-job-list">
                  {unassignedItems.map((item, index) => (
                    <CoordinatorTaskCard
                      key={item.id}
                      item={item}
                      workers={workers}
                      sequence={index + 1}
                      defaultExpanded={index === 0}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {selectedAssignedItems.length > 0 ? (
              <section className="worker-work-section">
                <div className="worker-section-heading">
                  <div>
                    <p className="eyebrow">{formatLongDate(selectedDate)}</p>
                    <h2>{selectedDateKey === todayKey ? "Today’s assigned work" : "Assigned work"}</h2>
                  </div>
                  <span>{selectedAssignedItems.length} {selectedAssignedItems.length === 1 ? "task" : "tasks"}</span>
                </div>
                <div className="worker-job-list">
                  {selectedAssignedItems.map((item, index) => (
                    <CoordinatorTaskCard
                      key={item.id}
                      item={item}
                      workers={workers}
                      sequence={index + 1}
                      defaultExpanded={unassignedItems.length === 0 && index === 0}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <section className="panel worker-date-empty">
                <span className="worker-empty-icon"><CheckCircle2 size={24} /></span>
                <EmptyState title="No assigned work on this date" description="Choose another work date, or use the Needs assignment section above to give a task to a worker." />
              </section>
            )}

            {unscheduledAssignedItems.length > 0 ? (
              <section className="worker-work-section">
                <div className="worker-section-heading">
                  <div><p className="eyebrow">Coordinator action</p><h2>Awaiting schedule</h2></div>
                  <span>{unscheduledAssignedItems.length} {unscheduledAssignedItems.length === 1 ? "task" : "tasks"}</span>
                </div>
                <div className="worker-job-list">
                  {unscheduledAssignedItems.map((item, index) => (
                    <CoordinatorTaskCard
                      key={item.id}
                      item={item}
                      workers={workers}
                      sequence={index + 1}
                      defaultExpanded={unassignedItems.length === 0 && selectedAssignedItems.length === 0 && index === 0}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
