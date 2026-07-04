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
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer / Job</th>
                  <th>Thread</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((draft) => {
                  const extraction = parseLeadExtraction(draft.extraction_payload);
                  const title =
                    extraction.projectTitle ||
                    extraction.leadTitle ||
                    extraction.issue ||
                    "WhatsApp conversation";
                  const customer = extraction.customerName || "Unknown customer";

                  return (
                    <tr key={draft.id}>
                      <td>
                        <Link href={`/reviews/${draft.id}`} className="table-link">
                          {title}
                        </Link>
                        <div className="helper-text">{customer}</div>
                      </td>
                      <td>{draft.thread_id}</td>
                      <td>
                        <StatusBadge status={draft.status} />
                      </td>
                      <td>{formatDateTime(draft.updated_at)}</td>
                      <td>
                        {draft.status === "converted_to_project"
                          ? "Project already created"
                          : draft.status === "converted_to_lead"
                            ? "Lead already created"
                            : "Awaiting review"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
