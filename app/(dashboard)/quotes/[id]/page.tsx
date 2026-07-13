import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuoteDetail } from "@/backend/repositories";
import { EmptyState } from "@/frontend/components/dashboard/empty-state";
import { QuoteActions } from "@/frontend/components/dashboard/quote-actions";
import { QuoteEditor } from "@/frontend/components/dashboard/quote-editor";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";
import { BackButton } from "@/frontend/components/navigation/back-button";
import { formatDateTime, formatMoney } from "@/frontend/lib/format";
import { requireAppSession } from "@/lib/auth/session";
import { listSecondBrainSummaries } from "@/backend/services/ai/second-brain";
import { SecondBrainPanel } from "@/frontend/components/dashboard/second-brain-panel";

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
  const [quote, secondBrain] = await Promise.all([getQuoteDetail(id), listSecondBrainSummaries("quote", id)]);

  if (!quote) {
    notFound();
  }

  const lead = firstRelation(quote.leads);
  const project = firstRelation(quote.projects);
  const quoteItems = Array.isArray(quote.quote_items)
    ? [...quote.quote_items].sort((a, b) => a.line_no - b.line_no)
    : [];

  return (
    <div className="page-stack quote-page">
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
            <h2>{quote.quote_number} / Version {quote.version_number}</h2>
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
          <div>
            <span className="summary-label">Valid until</span>
            <p>{formatDateTime(quote.valid_until)}</p>
          </div>
          <div>
            <span className="summary-label">Delivery evidence</span>
            <p>{quote.delivery_method ? `${quote.delivery_method} · ${quote.delivery_reference ?? "No reference"}` : "Not delivered"}</p>
          </div>
        </div>

        <QuoteActions
          quoteId={quote.id}
          status={quote.status_code}
          projectId={quote.project_id}
        />
      </section>

      <SecondBrainPanel entityType="quote" entityId={quote.id} summaries={secondBrain} expectedTypes={["negotiation", "approved_scope", "decision_needed"]} />

      {quote.status_code === "draft" ? (
        <QuoteEditor
          quoteId={quote.id}
          currencyCode={quote.currency_code}
          initialNotes={quote.notes}
          initialDiscount={Number(quote.discount_amount)}
          initialItems={quoteItems.map((item) => {
            const pricingItem = firstRelation(item.pricing_items);
            const catalog = firstRelation(pricingItem?.pricing_catalogs);
            return {
              id: item.id,
              pricingItemId: item.pricing_item_id,
              title: item.title,
              description: item.description ?? "",
              quantity: Number(item.quantity),
              unitLabel: item.unit_label ?? "item",
              unitPrice: Number(item.unit_price),
              notes: item.notes ?? "",
              decisionStatus: item.decision_status as "proposed" | "approved" | "rejected" | "deferred",
              decisionNotes: item.decision_notes ?? "",
              catalogLabel: catalog?.name ?? null,
              pricingMatchStatus: item.pricing_match_status as "matched" | "needs_review" | "manual",
              pricingMatchConfidence: item.pricing_match_confidence,
              pricingMatchMethod: item.pricing_match_method,
              pricingMatchNotes: item.pricing_match_notes,
            };
          })}
        />
      ) : (
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
          <div className="review-draft-list quote-scope-list">
            <div className="review-draft-list-head quote-scope-row" aria-hidden="true">
              <span>Item</span>
              <span>Qty</span>
              <span>Rate</span>
              <span>Total</span>
              <span>Decision</span>
            </div>
            {quoteItems.map((item) => (
              <div key={item.id} className="review-draft-row quote-scope-row">
                <div className="review-draft-meta-group">
                  <strong className="review-draft-title">{item.line_no}. {item.title}</strong>
                  <span className="review-draft-meta">{item.description ?? item.notes ?? "No description"}</span>
                </div>
                <span className="quote-scope-number" data-label="Quantity">{item.quantity} {item.unit_label ?? "item"}</span>
                <span className="quote-scope-number" data-label="Rate">{formatMoney(item.unit_price)}</span>
                <strong className="quote-scope-number" data-label="Total">{formatMoney(item.total_price)}</strong>
                <div className="quote-scope-decision">
                  <StatusBadge status={item.decision_status} />
                  {item.decision_notes ? <span className="review-draft-meta">{item.decision_notes}</span> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      )}
    </div>
  );
}
