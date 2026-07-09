import Link from "next/link";
import { listLeads } from "@/backend/repositories";
import { EmptyState } from "@/frontend/components/dashboard/empty-state";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";
import { formatDateTime } from "@/frontend/lib/format";
import { requireAppSession } from "@/lib/auth/session";

export default async function LeadsPage() {
  await requireAppSession(["owner", "admin"]);
  const leads = await listLeads();

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Pipeline</p>
          <h1>Leads</h1>
          <p className="page-header-copy">
            WhatsApp enquiries stay here until a quote is approved or a site visit is confirmed.
          </p>
        </div>
      </section>

      <section className="panel table-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Lead Capture</p>
            <h2>{leads.length} leads</h2>
          </div>
        </div>

        {leads.length === 0 ? (
          <EmptyState
            title="No leads yet"
            description="Incoming WhatsApp enquiries will appear here before becoming quotes or projects."
          />
        ) : (
          <div className="review-draft-list">
            <div className="review-draft-list-head" aria-hidden="true">
              <span>Customer / Request</span>
              <span>Lead ID</span>
              <span>Status</span>
              <span>Updated</span>
              <span>Next Action</span>
            </div>

            {leads.map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="review-draft-row">
                <div>
                  <strong>{lead.title ?? "WhatsApp enquiry"}</strong>
                </div>
                <span>{lead.lead_code}</span>
                <StatusBadge status={lead.status_code} />
                <span>{formatDateTime(lead.last_activity_at ?? lead.updated_at)}</span>
                <span>
                  {lead.status_code === "site_visit"
                    ? "Confirm inspection or prepare quote"
                    : "Qualify and prepare quote"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
