import { getWorkerWorkspace } from "@/backend/services/projects/get-worker-workspace";
import { EmptyState } from "@/frontend/components/dashboard/empty-state";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";
import { formatDateTime } from "@/frontend/lib/format";
import { requireAppSession } from "@/lib/auth/session";

export default async function WorkerPage() {
  const session = await requireAppSession([
    "owner",
    "admin",
    "coordinator",
    "field_worker",
  ]);
  const items = await getWorkerWorkspace(session.profile.id);

  return (
    <main className="auth-shell">
      <section className="auth-card" style={{ maxWidth: 980 }}>
        <div className="page-stack">
          <div>
            <h1>{session.profile.displayName}</h1>
          </div>

          {items.length === 0 ? (
            <EmptyState
              title="No assigned work items"
              description="Once jobs are assigned to this profile, they will appear here."
            />
          ) : (
            <div className="todo-list">
              {items.map((item) => (
                <article key={item.id} className="todo-card">
                  <div className="todo-card-header">
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.actionSummary ?? item.areaName ?? "Assigned task"}</p>
                    </div>
                    <StatusBadge status={item.statusCode} />
                  </div>

                  <div className="todo-card-meta">
                    <span>{item.project?.title ?? "Unlinked project"}</span>
                    <span>{item.project?.projectCode ?? "No project code"}</span>
                    <span>
                      Due {item.scheduledDueAt ? formatDateTime(item.scheduledDueAt) : "not scheduled"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
