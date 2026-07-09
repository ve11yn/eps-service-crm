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
          <h1>Leads</h1>
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
          <div className="workflow-list lead-workflow-list">
            <div className="workflow-list-head" aria-hidden="true">
              <span>Name / Request</span>
              <span>Status</span>
              <span>Last Updated</span>
              <span>Action</span>
            </div>

            {leads.map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="workflow-list-row">
                <div className="workflow-list-main">
                  <strong className="workflow-list-title">{lead.title ?? "WhatsApp enquiry"}</strong>
                  <span className="workflow-list-meta">{lead.lead_code}</span>
                </div>
                <StatusBadge status={lead.status_code} />
                <span>{formatDateTime(lead.last_activity_at ?? lead.updated_at)}</span>
                <span className="workflow-list-action">
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
