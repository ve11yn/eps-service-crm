import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeadDetail } from "@/backend/services/leads/get-lead-detail";
import { listQuotesByLeadId } from "@/backend/repositories";
import { EmptyState } from "@/frontend/components/dashboard/empty-state";
import { LeadActions } from "@/frontend/components/dashboard/lead-actions";
import { LeadQuoteActions } from "@/frontend/components/dashboard/lead-quote-actions";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";
import { BackButton } from "@/frontend/components/navigation/back-button";
import { formatDateTime, formatMoney } from "@/frontend/lib/format";
import { requireAppSession } from "@/lib/auth/session";
import { listSecondBrainSummaries } from "@/backend/services/ai/second-brain";
import { SecondBrainPanel } from "@/frontend/components/dashboard/second-brain-panel";

type LeadDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  await requireAppSession(["owner", "admin"]);
  const { id } = await params;
  const [lead, quotes, secondBrain] = await Promise.all([
    getLeadDetail(id),
    listQuotesByLeadId(id),
    listSecondBrainSummaries("lead", id),
  ]);

  if (!lead) {
    notFound();
  }

  const contact = Array.isArray(lead.contacts) ? lead.contacts[0] : lead.contacts;
  const property = Array.isArray(lead.properties) ? lead.properties[0] : lead.properties;
  const thread = Array.isArray(lead.whatsapp_threads)
    ? lead.whatsapp_threads[0]
    : lead.whatsapp_threads;

  return (
    <div className="page-stack lead-page">
      <section className="page-header">
        <div className="page-header-title-row">
          <BackButton fallbackHref="/leads" label="Back to Leads" className="back-icon-button" iconOnly />
          <h1>Leads</h1>
        </div>
        <StatusBadge status={lead.status_code} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Qualification</p>
            <h2>Lead Details</h2>
          </div>
          {thread ? (
            <Link className="button button-secondary" href={`/inbox?thread=${thread.id}`}>
              Open Inbox
            </Link>
          ) : null}
        </div>

        <dl className="details-grid">
          <div>
            <dt>Contact</dt>
            <dd>{contact?.full_name ?? contact?.whatsapp_number ?? "Empty"}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{contact?.whatsapp_number ?? contact?.primary_phone ?? "Empty"}</dd>
          </div>
          <div>
            <dt>Property</dt>
            <dd>{property ? `${property.address_line_1}${property.unit_no ? ` ${property.unit_no}` : ""}` : "Empty"}</dd>
          </div>
          <div>
            <dt>Received</dt>
            <dd>{formatDateTime(lead.received_at)}</dd>
          </div>
          <div>
            <dt>AI Summary</dt>
            <dd>{lead.ai_summary ?? lead.summary ?? "Empty"}</dd>
          </div>
          <div>
            <dt>Decision Needed</dt>
            <dd>{lead.site_visit_required ? "Site visit required" : lead.qualification_notes ?? "No blocker recorded"}</dd>
          </div>
        </dl>
        <LeadActions leadId={lead.id} status={lead.status_code} />
      </section>

      <SecondBrainPanel entityType="lead" entityId={lead.id} summaries={secondBrain} expectedTypes={["lead", "decision_needed"]} />

      <section className="panel table-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Quotes</p>
            <h2>{quotes.length} quote versions</h2>
          </div>
          <LeadQuoteActions
            leadId={lead.id}
            latestQuoteId={quotes[0]?.id ?? null}
          />
        </div>

        {quotes.length === 0 ? (
          <EmptyState
            title="No quotes yet"
            description="Review work items from intake to create a draft quote before any project is opened."
          />
        ) : (
          <div className="review-draft-list">
            <div className="review-draft-list-head" aria-hidden="true">
              <span>Quote</span>
              <span>Version</span>
              <span>Status</span>
              <span>Updated</span>
              <span>Total</span>
            </div>
            {quotes.map((quote) => (
              <Link key={quote.id} href={`/quotes/${quote.id}`} className="review-draft-row">
                <div className="review-draft-meta-group">
                  <strong className="review-draft-title">Quote version {quote.version_number}</strong>
                  <span className="review-draft-meta">{quote.project_id ? "Project created" : "No project yet"}</span>
                </div>
                <span>v{quote.version_number}</span>
                <StatusBadge status={quote.status_code} />
                <span>{formatDateTime(quote.updated_at)}</span>
                <span>{formatMoney(quote.total_amount)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
