import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuoteDetail } from "@/backend/repositories";
import { EmptyState } from "@/frontend/components/dashboard/empty-state";
import { QuoteActions } from "@/frontend/components/dashboard/quote-actions";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";
import { BackButton } from "@/frontend/components/navigation/back-button";
import { formatDateTime, formatMoney } from "@/frontend/lib/format";
import { requireAppSession } from "@/lib/auth/session";

type QuoteDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  await requireAppSession(["owner", "admin"]);
  const { id } = await params;
  const quote = await getQuoteDetail(id);

  if (!quote) {
    notFound();
  }

  const lead = firstRelation(quote.leads);
  const project = firstRelation(quote.projects);
  const quoteItems = Array.isArray(quote.quote_items) ? quote.quote_items : [];

  return (
    <div className="page-stack">
      <section className="page-header">
        <div className="page-header-title-row">
          <BackButton fallbackHref="/quotes" label="Back to Quotes" className="back-icon-button" iconOnly />
          <h1>Quotes</h1>
        </div>
        <StatusBadge status={quote.status_code} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Approval Gate</p>
            <h2>Quote Decision</h2>
          </div>
          <div className="inline-actions">
            {lead ? (
              <Link className="button button-secondary" href={`/leads/${lead.id}`}>
                Open Lead
              </Link>
            ) : null}
            {project ? (
              <Link className="button button-secondary" href={`/projects/${project.id}`}>
                Open Project
              </Link>
            ) : null}
          </div>
        </div>

        <div className="summary-grid">
          <div>
            <span className="summary-label">Lead</span>
            <p>{lead?.title ?? "Unlinked"}</p>
          </div>
          <div>
            <span className="summary-label">Created</span>
            <p>{formatDateTime(quote.created_at)}</p>
          </div>
          <div>
            <span className="summary-label">Sent</span>
            <p>{formatDateTime(quote.sent_at)}</p>
          </div>
          <div>
            <span className="summary-label">Approved</span>
            <p>{formatDateTime(quote.approved_at)}</p>
          </div>
        </div>

        <QuoteActions
          quoteId={quote.id}
          status={quote.status_code}
          projectId={quote.project_id}
        />
      </section>

      <section className="panel table-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Scope</p>
            <h2>{quoteItems.length} quote items</h2>
          </div>
          <span className="helper-text">Total {formatMoney(quote.total_amount)}</span>
        </div>

        {quoteItems.length === 0 ? (
          <EmptyState
            title="No quote items"
            description="A quote needs at least one item before it can become a project."
          />
        ) : (
          <div className="review-draft-list">
            <div className="review-draft-list-head" aria-hidden="true">
              <span>Item</span>
              <span>Qty</span>
              <span>Unit</span>
              <span>Total</span>
              <span>Project Link</span>
            </div>
            {quoteItems.map((item) => (
              <div key={item.id} className="review-draft-row">
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.description ?? item.notes ?? "No description"}</span>
                </div>
                <span>{item.quantity}</span>
                <span>{formatMoney(item.unit_price)}</span>
                <span>{formatMoney(item.total_price)}</span>
                <span>{item.source_project_item_id ? "Work item created" : "Pending approval"}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
