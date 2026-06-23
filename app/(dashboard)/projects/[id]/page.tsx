import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectDetail } from "@/backend/services/projects/get-project-detail";
import { EmptyState } from "@/frontend/components/dashboard/empty-state";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";
import { formatDate, formatDateTime, formatMoney } from "@/frontend/lib/format";

type ProjectDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
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

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <Link href="/projects" className="back-link">
            ← Back to Projects
          </Link>
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
              <button className="button button-secondary" type="button">
                Send Quote
              </button>
              <Link className="button button-secondary" href={thread ? `/inbox?thread=${thread.id}` : "/inbox"}>
                Open Chat
              </Link>
              <button className="button button-primary" type="button">
                Finish Project
              </button>
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
            <EmptyState
              title="Attachments view not connected yet"
              description="This section will later read documents and media assets tied to the project."
            />
          </section>
        </div>
      </section>
    </div>
  );
}
