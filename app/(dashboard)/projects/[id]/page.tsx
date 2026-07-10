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
import { EmptyState } from "@/frontend/components/dashboard/empty-state";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";
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
  const project = await getProjectDetail(id);

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
                <dt>General Information</dt>
                <dd>{project.scope_summary ?? project.remarks ?? "Empty"}</dd>
              </div>
            </dl>
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
