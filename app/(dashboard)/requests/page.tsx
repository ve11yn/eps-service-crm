import { listReviewDrafts, listProjects } from "@/backend/repositories";
import {
  ActionQueueItem,
  formatQueueSource,
} from "@/frontend/components/dashboard/action-queue-item";
import { EmptyState } from "@/frontend/components/dashboard/empty-state";
import { parseLeadExtraction } from "@/frontend/lib/review-drafts";
import { requireAppSession } from "@/lib/auth/session";

export default async function RequestsPage() {
  await requireAppSession(["owner", "admin"]);
  const [drafts, projects] = await Promise.all([listReviewDrafts(), listProjects()]);

  const activeProjects = projects.filter(
    (project) =>
      project.status_code !== "completed",
  );

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <h1>Requests</h1>
        </div>
      </section>

      <section className="panel table-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Intake</p>
            <h2>{drafts.length} review requests</h2>
          </div>
        </div>

        {drafts.length === 0 ? (
          <EmptyState
            title="No review requests yet"
            description="Once a WhatsApp conversation is processed, it will show here."
          />
        ) : (
          <div className="review-draft-list">
            <div className="review-draft-list-head" aria-hidden="true">
              <span>Customer / Job</span>
              <span>Source</span>
              <span>Status</span>
              <span>Updated</span>
              <span>Decision</span>
            </div>

            {drafts.map((draft) => {
              const extraction = parseLeadExtraction(draft.extraction_payload);
              const title =
                extraction.projectTitle ||
                extraction.leadTitle ||
                extraction.issue ||
                "WhatsApp conversation";
              const customer = extraction.customerName || "Unknown customer";
              const decision =
                draft.status === "converted_to_project"
                  ? "Project already created"
                  : draft.status === "converted_to_lead"
                    ? "Lead already created"
                    : "Awaiting review";

              return (
                <ActionQueueItem
                  key={draft.id}
                  href={`/inbox/reviews/${draft.id}`}
                  title={title}
                  subtitle={customer}
                  contextLabel="Source"
                  contextValue={formatQueueSource(draft.source_channel_code)}
                  status={draft.status}
                  updatedAt={draft.updated_at}
                  finalValue={decision}
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="panel table-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Operations</p>
              <h2>{activeProjects.length} project requests</h2>
            </div>
          </div>

        {activeProjects.length === 0 ? (
          <EmptyState
            title="No active project requests"
            description="Scheduled jobs, QA work, invoicing, and escalations will show here."
          />
        ) : (
          <div className="review-draft-list">
            <div className="review-draft-list-head" aria-hidden="true">
              <span>Project</span>
              <span>Type</span>
              <span>Status</span>
              <span>Updated</span>
              <span>Next Action</span>
            </div>

            {activeProjects.map((project) => (
              <ActionQueueItem
                key={project.id}
                href={`/projects/${project.id}`}
                title={project.title}
                subtitle="Project request"
                contextLabel="Type"
                contextValue="Project"
                status={project.status_code}
                updatedAt={project.updated_at}
                finalValue={
                  project.status_code === "qa_review"
                    ? "Check work completion and photos"
                    : project.status_code === "invoiced"
                      ? "Follow up payment"
                      : project.status_code === "in_progress"
                          ? "Confirm work progress"
                          : "Review schedule and assignment"
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
