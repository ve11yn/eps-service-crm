import Link from "next/link";
import { listProjects } from "@/backend/repositories";
import { EmptyState } from "@/frontend/components/dashboard/empty-state";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";
import { formatDate } from "@/frontend/lib/format";

type ProjectsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
};

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const projects = await listProjects();
  const query = params.q?.trim().toLowerCase() ?? "";
  const status = params.status?.trim().toLowerCase() ?? "";

  const filteredProjects = projects.filter((project) => {
    const matchesQuery =
      !query ||
      project.title.toLowerCase().includes(query) ||
      project.project_code.toLowerCase().includes(query);
    const matchesStatus =
      !status || project.status_code.toLowerCase() === status;

    return matchesQuery && matchesStatus;
  });

  return (
    <div className="page-stack">
      <section className="page-header page-header-inline">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Projects</h1>
        </div>
        <form className="toolbar-form" action="/projects">
          <input
            className="input"
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search project"
          />
          <select className="input input-select" name="status" defaultValue={params.status ?? ""}>
            <option value="">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="qa_review">QA Review</option>
            <option value="invoiced">Invoiced</option>
            <option value="completed">Completed</option>
          </select>
          <button className="button button-secondary" type="submit">
            Filter
          </button>
        </form>
      </section>

      {filteredProjects.length === 0 ? (
        <div className="panel">
          <EmptyState
            title="No projects found"
            description="Try another search term or create a project from an approved review draft."
          />
        </div>
      ) : (
        <section className="project-grid">
          {filteredProjects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="project-card panel"
            >
              <div className="project-card-media" />
              <div className="project-card-body">
                <div className="project-card-title-row">
                  <h2>{project.title}</h2>
                  <StatusBadge status={project.status_code} />
                </div>
                <p className="project-card-meta">
                  Due {formatDate(project.scheduled_end_at ?? project.payment_due_at)}
                </p>
                <p className="project-card-code">{project.project_code}</p>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
