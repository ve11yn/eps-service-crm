import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckSquare,
  FileText,
  MessageCircle,
  Paperclip,
  TrendingUp,
} from "lucide-react";
import { getProjectDetail } from "@/backend/services/projects/get-project-detail";
import { listStaffAccounts } from "@/backend/services/auth/user-management";
import { listContacts, listProperties } from "@/backend/repositories";
import { EmptyState } from "@/frontend/components/dashboard/empty-state";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";
import { ProjectItemAssignment } from "@/frontend/components/dashboard/project-item-assignment";
import { FieldUpdateResolution } from "@/frontend/components/dashboard/field-update-resolution";
import { ProjectCloseout } from "@/frontend/components/dashboard/project-closeout";
import { ProjectDetailsEditor, ProjectTeamManager, ScopeChangeManager, WorkItemManager } from "@/frontend/components/dashboard/project-management";
import { BackButton } from "@/frontend/components/navigation/back-button";
import { formatDate, formatDateTime, formatMoney } from "@/frontend/lib/format";
import { requireAppSession } from "@/lib/auth/session";

type ProjectDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  await requireAppSession(["owner", "admin", "coordinator"]);
  const { id } = await params;
  const [project, staff, contacts, properties] = await Promise.all([getProjectDetail(id), listStaffAccounts(), listContacts(), listProperties()]);

  if (!project) {
    notFound();
  }

  const contact = Array.isArray(project.contacts) ? project.contacts[0] : project.contacts;
  const property = Array.isArray(project.properties) ? project.properties[0] : project.properties;
  const projectItems = Array.isArray(project.project_items) ? project.project_items : [];
  const mediaAssets = Array.isArray(project.media_assets) ? project.media_assets : [];
  const inboxPreview = project.inbox_preview;
  const inboxThread = inboxPreview?.thread ?? null;
  const inboxMessages = Array.isArray(inboxPreview?.messages) ? inboxPreview.messages : [];
  const inboxReviewDraft = inboxPreview?.review_draft ?? null;
  const workers = staff
    .filter((member) => member.roleCode === "field_worker" && member.isActive)
    .map((member) => ({ id: member.id, displayName: member.displayName }));
  const fieldUpdates = Array.isArray(project.project_field_updates) ? project.project_field_updates : [];
  const projectInvoices = Array.isArray(project.invoices) ? project.invoices : [];
  const projectPayments = Array.isArray(project.payments) ? project.payments : [];
  const outstandingBalance = projectInvoices.reduce((sum, invoice) => sum + Number(invoice.balance_due_amount), 0);
  const closeoutItems = projectItems.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status_code,
    required: item.before_after_required,
    hasBefore: Array.isArray(item.media_assets) && item.media_assets.some((asset) => asset.evidence_type === "before"),
    hasAfter: Array.isArray(item.media_assets) && item.media_assets.some((asset) => asset.evidence_type === "after"),
  }));
  const staffOptions = staff.filter((member) => member.isActive).map((member) => ({ id: member.id, label: `${member.displayName} (${member.roleCode.replaceAll("_", " ")})` }));
  const contactOptions = contacts.filter((record) => !record.is_archived).map((record) => ({ id: record.id, label: record.full_name }));
  const propertyOptions = properties.filter((record) => !record.is_archived).map((record) => ({ id: record.id, label: record.property_name ?? `${record.address_line_1}${record.unit_no ? ` ${record.unit_no}` : ""}` }));
  const scopeChanges = Array.isArray(project.project_scope_changes) ? [...project.project_scope_changes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : [];
  const teamMembers = Array.isArray(project.project_team_members) ? project.project_team_members : [];

  return (
    <div className="page-stack">
      <section className="page-header">
        <div className="page-header-title-row">
          <BackButton fallbackHref="/projects" label="Back to Projects" className="back-icon-button" iconOnly />
          <h1>Jobs / Projects</h1>
        </div>
        <StatusBadge status={project.status_code} />
      </section>

      <section className="project-detail-layout">
        <aside className="panel detail-sidebar">
          <div className="detail-sidebar-group">
            <p className="detail-sidebar-heading">Sections</p>
            <nav className="detail-nav" aria-label="Project sections">
              <a href="#inbox" className="detail-menu-link">
                <MessageCircle className="dashboard-nav-icon" aria-hidden="true" size={18} strokeWidth={2} />
                <span>Conversation</span>
              </a>
              <a href="#details" className="detail-menu-link">
                <FileText className="dashboard-nav-icon" aria-hidden="true" size={18} strokeWidth={2} />
                <span>Details</span>
              </a>
              <a href="#todo" className="detail-menu-link">
                <CheckSquare className="dashboard-nav-icon" aria-hidden="true" size={18} strokeWidth={2} />
                <span>To-do</span>
              </a>
              <a href="#attachments" className="detail-menu-link">
                <Paperclip className="dashboard-nav-icon" aria-hidden="true" size={18} strokeWidth={2} />
                <span>Attachments</span>
              </a>
            </nav>
          </div>

          <div className="detail-sidebar-group" id="inbox">
            <p className="detail-sidebar-heading">Conversation</p>
            {inboxThread ? (
              <div className="detail-summary-list">
                <div className="detail-summary-item">
                  <span>Thread</span>
                  <strong>{inboxThread.thread_subject ?? "Chat thread"}</strong>
                </div>
                <div className="detail-summary-item">
                  <span>Last activity</span>
                  <strong>{formatDateTime(inboxThread.last_message_at)}</strong>
                </div>
                <div className="detail-summary-item">
                  <span>Draft</span>
                  <strong>{inboxReviewDraft ? inboxReviewDraft.status : "No draft yet"}</strong>
                </div>
                <div className="detail-summary-item">
                  <span>Messages</span>
                  <strong>{inboxMessages.length}</strong>
                </div>
                <div className="detail-summary-actions">
                  <Link className="detail-sidebar-button" href={`/inbox?thread=${inboxThread.id}`}>
                    <MessageCircle className="dashboard-nav-icon" aria-hidden="true" size={18} strokeWidth={2} />
                    <span>Open Inbox</span>
                  </Link>
                  {inboxReviewDraft ? (
                    <Link className="detail-sidebar-button detail-sidebar-button-primary" href={`/inbox/reviews/${inboxReviewDraft.id}`}>
                      <FileText className="dashboard-nav-icon" aria-hidden="true" size={18} strokeWidth={2} />
                      <span>Review Intake</span>
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="detail-summary-list">
                <p className="detail-sidebar-note">No inbox linked yet.</p>
                <Link className="detail-sidebar-button" href="/inbox">
                  <MessageCircle className="dashboard-nav-icon" aria-hidden="true" size={18} strokeWidth={2} />
                  <span>Open Inbox</span>
                </Link>
                {inboxReviewDraft ? (
                  <Link className="detail-sidebar-button detail-sidebar-button-primary" href={`/inbox/reviews/${inboxReviewDraft.id}`}>
                    <FileText className="dashboard-nav-icon" aria-hidden="true" size={18} strokeWidth={2} />
                    <span>Review Intake</span>
                  </Link>
                ) : null}
              </div>
            )}
          </div>

          <div className="detail-sidebar-group">
            <p className="detail-sidebar-heading">Progress</p>
            <div className="detail-menu-link detail-menu-status">
              <TrendingUp className="dashboard-nav-icon" aria-hidden="true" size={18} strokeWidth={2} />
              <span>Current status</span>
              <StatusBadge status={project.status_code} />
            </div>
          </div>

        </aside>

        <div className="page-stack">
          <section className="panel media-hero" />

          <section className="panel" id="details">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Project Info</p>
                <h2>Details</h2>
              </div>
            </div>

            <dl className="details-grid">
              <div>
                <dt>Address</dt>
                <dd>{property ? `${property.property_name ? `${property.property_name}, ` : ""}${property.address_line_1}${property.unit_no ? ` ${property.unit_no}` : ""}` : "Empty"}</dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>{contact?.whatsapp_number ?? contact?.primary_phone ?? "Empty"}</dd>
              </div>
              <div>
                <dt>Inquiry Date</dt>
                <dd>{formatDate(project.enquiry_at)}</dd>
              </div>
              <div>
                <dt>Inspection Date</dt>
                <dd>{formatDate(project.scheduled_start_at)}</dd>
              </div>
              <div>
                <dt>Start Date &amp; Time</dt>
                <dd>
                  {formatDateTime(project.scheduled_start_at)}
                  {project.scheduled_end_at ? ` - ${formatDateTime(project.scheduled_end_at)}` : ""}
                </dd>
              </div>
              <div>
                <dt>Handover Date</dt>
                <dd>{formatDate(project.handover_at)}</dd>
              </div>
              <div>
                <dt>Payment Follow-up</dt>
                <dd>{formatDate(project.payment_follow_up_at)}</dd>
              </div>
              <div>
                <dt>Payment Status</dt>
                <dd>{outstandingBalance === 0 && projectInvoices.length ? "Paid" : projectInvoices.length ? `Outstanding ${formatMoney(outstandingBalance)}` : "Not invoiced"}</dd>
              </div>
              <div>
                <dt>Verified Payments</dt>
                <dd>{formatMoney(projectPayments.filter((payment) => payment.status_code === "paid").reduce((sum, payment) => sum + Number(payment.amount), 0))}</dd>
              </div>
              <div>
                <dt>General Information</dt>
                <dd>{project.scope_summary ?? project.remarks ?? "Empty"}</dd>
              </div>
            </dl>
            <details className="management-details">
              <summary>Edit project details</summary>
              <ProjectDetailsEditor
                project={project}
                contacts={contactOptions}
                properties={propertyOptions}
                staff={staffOptions}
              />
            </details>
          </section>

          <section className="panel" id="team-management">
            <div className="panel-header"><div><p className="eyebrow">Assignment</p><h2>Project Team</h2></div></div>
            <ProjectTeamManager projectId={project.id} staff={staffOptions} members={teamMembers} />
          </section>

          <section className="panel" id="work-item-management">
            <div className="panel-header"><div><p className="eyebrow">Scope &amp; costs</p><h2>Work-item Management</h2></div></div>
            <WorkItemManager projectId={project.id} items={projectItems} />
          </section>

          <section className="panel" id="scope-changes">
            <div className="panel-header"><div><p className="eyebrow">Audit trail</p><h2>Scope Changes, Add-ons &amp; Rework</h2></div></div>
            <ScopeChangeManager projectId={project.id} items={projectItems} changes={scopeChanges} />
          </section>

          <section className="panel" id="todo">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Execution</p>
                <h2>To-do</h2>
              </div>
            </div>

            {projectItems.length === 0 ? (
              <EmptyState
                title="No project items yet"
                description="Once work items are added from review approval or manual editing, they will show here."
              />
            ) : (
              <div className="todo-list">
                {projectItems.map((item) => (
                  <article key={item.id} className="todo-card">
                    <div className="todo-card-header">
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.description ?? item.action_summary ?? "No extra description"}</p>
                      </div>
                      <StatusBadge status={item.status_code} />
                    </div>
                    <div className="todo-card-meta">
                      <span>{item.area_name ?? "General area"}</span>
                      <span>{formatMoney(item.quoted_amount)}</span>
                    </div>
                    <ProjectItemAssignment
                      itemId={item.id}
                      workers={workers}
                      initialAssignedProfileId={item.assigned_profile_id}
                      initialBeforeAfterRequired={item.before_after_required}
                      initialScheduledStartAt={item.scheduled_start_at}
                      initialScheduledDueAt={item.scheduled_due_at}
                    />
                    {Array.isArray(item.media_assets) && item.media_assets.length > 0 ? (
                      <div className="project-item-media-grid">
                        {item.media_assets.map((asset) => (
                          <a
                            key={asset.id}
                            href={asset.signed_url ?? "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="project-item-media"
                          >
                            {asset.signed_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={asset.signed_url}
                                alt={asset.caption ?? item.title}
                              />
                            ) : (
                              <span>Image unavailable</span>
                            )}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="panel" id="field-updates">
            <div className="panel-header">
              <div><p className="eyebrow">Field Operations</p><h2>Worker Updates &amp; Alerts</h2></div>
              <span className="helper-text">{fieldUpdates.filter((update) => update.requires_attention && !update.resolved_at).length} unresolved</span>
            </div>
            {fieldUpdates.length === 0 ? (
              <EmptyState title="No field updates" description="Worker progress and issue reports will appear here." />
            ) : (
              <div className="field-update-list">
                {fieldUpdates.map((update) => {
                  const worker = Array.isArray(update.worker_profile) ? update.worker_profile[0] : update.worker_profile;
                  const resolver = Array.isArray(update.resolved_by_profile) ? update.resolved_by_profile[0] : update.resolved_by_profile;
                  return (
                    <article key={update.id} className={`field-update-card ${update.requires_attention && !update.resolved_at ? "needs-attention" : ""}`}>
                      <div className="field-update-header">
                        <div>
                          <strong>{update.update_type.replaceAll("_", " ")}</strong>
                          <span>{worker?.display_name ?? "Worker"} · {formatDateTime(update.created_at)}</span>
                        </div>
                        {update.requires_attention ? <StatusBadge status={update.resolved_at ? "completed" : "needs_review"} /> : null}
                      </div>
                      {update.issue_type ? <p><strong>{update.issue_type.replaceAll("_", " ")}</strong></p> : null}
                      {update.notes ? <p>{update.notes}</p> : null}
                      {update.resolved_at ? (
                        <p className="helper-text">Resolved by {resolver?.display_name ?? "admin"}: {update.resolution_notes ?? "No resolution note"}</p>
                      ) : update.requires_attention ? (
                        <FieldUpdateResolution projectId={project.id} updateId={update.id} />
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <ProjectCloseout
            projectId={project.id}
            status={project.status_code}
            qaStatus={project.qa_status}
            signoffStatus={project.customer_signoff_status}
            customerName={project.customer_signed_by_name}
            summary={project.completion_summary}
            reviewGeneratedAt={project.review_request_generated_at}
            items={closeoutItems}
          />

          <section className="panel" id="attachments">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Files</p>
                <h2>Attachments</h2>
              </div>
            </div>
            {mediaAssets.length === 0 ? (
              <EmptyState
                title="No attachments yet"
                description="Images uploaded from review work items will appear here after project creation."
              />
            ) : (
              <div className="project-attachment-grid">
                {mediaAssets.map((asset) => (
                  <a
                    key={asset.id}
                    href={asset.signed_url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="project-attachment"
                  >
                    {asset.signed_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.signed_url} alt={asset.caption ?? "Project attachment"} />
                    ) : null}
                    <span>{asset.caption ?? asset.evidence_type ?? "Project image"}</span>
                  </a>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
