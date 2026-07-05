import Link from "next/link";
import { listReviewDrafts } from "@/backend/repositories";
import { EmptyState } from "@/frontend/components/dashboard/empty-state";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";
import { formatDateTime } from "@/frontend/lib/format";
import { parseLeadExtraction } from "@/frontend/lib/review-drafts";

export default async function ReviewDraftsPage() {
  const drafts = await listReviewDrafts();

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <h1>Review Queue</h1>
        </div>
     
      </section>

      <section className="panel table-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Drafts</p>
            <h2>{drafts.length} saved review drafts</h2>
          </div>
        </div>

        {drafts.length === 0 ? (
          <EmptyState
            title="No review drafts yet"
            description="Run AI extraction from the inbox or mock WhatsApp route and the drafts will show here."
          />
        ) : (
          <div className="review-draft-list">
            <div className="review-draft-list-head" aria-hidden="true">
              <span>Customer / Job</span>
              <span>Thread</span>
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
                <Link
                  key={draft.id}
                  href={`/reviews/${draft.id}`}
                  className="review-draft-row"
                >
                  <span className="review-draft-main">
                    <span className="review-draft-title">{title}</span>
                    <span className="helper-text">{customer}</span>
                  </span>
                  <span className="review-draft-meta">{draft.thread_id}</span>
                  <span>
                    <StatusBadge status={draft.status} />
                  </span>
                  <span className="review-draft-meta">
                    {formatDateTime(draft.updated_at)}
                  </span>
                  <span className="review-draft-meta">{decision}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
