import { getWorkerWorkspace } from "@/backend/services/projects/get-worker-workspace";
import { EmptyState } from "@/frontend/components/dashboard/empty-state";
import { WorkerFieldCard } from "@/frontend/components/worker/worker-field-card";
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
            <div className="worker-job-list">
              {items.map((item) => <WorkerFieldCard key={item.id} item={item} />)}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
