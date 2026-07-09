import Link from "next/link";
import { notFound } from "next/navigation";
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
  const thread = Array.isArray(project.whatsapp_threads)
    ? project.whatsapp_threads[0]
    : project.whatsapp_threads;
  const projectItems = Array.isArray(project.project_items) ? project.project_items : [];
  const mediaAssets = Array.isArray(project.media_assets) ? project.media_assets : [];
  const inboxPreview = project.inbox_preview;
  const inboxThread = inboxPreview?.thread ?? null;
  const inboxMessages = Array.isArray(inboxPreview?.messages) ? inboxPreview.messages : [];
  const inboxReviewDraft = inboxPreview?.review_draft ?? null;

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <BackButton fallbackHref="/projects" label="← Back to Projects" className="back-link" />
          <h1>{project.title}</h1>
          <p className="page-header-copy">{project.project_code}</p>
        </div>
        <StatusBadge status={project.status_code} />
      </section>

      <section className="project-detail-layout">
        <aside className="panel detail-sidebar">
          <div className="detail-sidebar-group">
            <p className="eyebrow">Sections</p>
            <nav className="detail-nav">
              <a href="#details">Details</a>
              <a href="#todo">To-do</a>
              <a href="#attachments">Attachments</a>
            </nav>
          </div>

          <div className="detail-sidebar-group">
            <p className="eyebrow">Progress</p>
            <StatusBadge status={project.status_code} />
          </div>

          <div className="detail-sidebar-group">
            <p className="eyebrow">Quick Actions</p>
            <div className="action-stack">
              <Link className="button button-secondary" href={thread ? `/inbox?thread=${thread.id}` : "/inbox"}>
                Open Chat
              </Link>
            </div>
          </div>
        </aside>

        <div className="page-stack">
          <section className="panel media-hero" />

          <section className="panel" id="inbox">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Inbox</p>
                <h2>Conversation</h2>
              </div>
              <div className="inline-actions">
                <Link
                  className="button button-secondary"
                  href={inboxThread ? `/inbox?thread=${inboxThread.id}` : "/inbox"}
                >
                  Open Inbox
                </Link>
                {inboxReviewDraft ? (
                  <Link className="button button-primary" href={`/inbox/reviews/${inboxReviewDraft.id}`}>
                    Review Intake
                  </Link>
                ) : null}
              </div>
            </div>

            {inboxThread ? (
              <div className="summary-grid">
                <div>
                  <span className="summary-label">Thread</span>
                  <p>{inboxThread.thread_subject ?? "Chat thread"}</p>
                </div>
                <div>
                  <span className="summary-label">Last activity</span>
                  <p>{formatDateTime(inboxThread.last_message_at)}</p>
                </div>
                <div>
                  <span className="summary-label">Draft</span>
                  <p>{inboxReviewDraft ? inboxReviewDraft.status : "No draft yet"}</p>
                </div>
                <div>
                  <span className="summary-label">Messages</span>
                  <p>{inboxMessages.length}</p>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No inbox linked to this project yet"
                description="When the WhatsApp thread is connected, the conversation will appear here."
              />
            )}

            {inboxMessages.length > 0 ? (
              <div className="message-list project-inbox-preview">
                {inboxMessages.slice(-3).map((message) => (
                  <article
                    key={message.id}
                    className={`message-bubble ${message.direction_code === "outbound" ? "is-outbound" : "is-inbound"}`}
                  >
                    <p className="message-meta">
                      {message.sender_name ?? (message.direction_code === "outbound" ? "Gage Admin" : "Customer")} · {formatDateTime(message.sent_at)}
                    </p>
                    <p>{message.content ?? message.media_caption ?? "Attachment"}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </section>

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
