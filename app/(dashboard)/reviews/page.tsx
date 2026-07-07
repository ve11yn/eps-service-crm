import Link from "next/link";
import { listReviewDrafts } from "@/backend/repositories";
import { EmptyState } from "@/frontend/components/dashboard/empty-state";
import {
  ActionQueueItem,
  formatQueueSource,
} from "@/frontend/components/dashboard/action-queue-item";
import { parseLeadExtraction } from "@/frontend/lib/review-drafts";

export default async function ReviewDraftsPage() {
  const drafts = await listReviewDrafts();

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <Link href="/requests" className="back-link">
            ← Back to Requests
          </Link>
          <p className="eyebrow">Reviews</p>
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
            description="Run AI extraction from an inbox conversation and the drafts will show here."
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
                  href={`/reviews/${draft.id}`}
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
    </div>
  );
}
