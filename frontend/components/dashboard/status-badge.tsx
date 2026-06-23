import { slugifyStatus } from "@/frontend/lib/format";

const labelMap: Record<string, string> = {
  needs_review: "Needs Review",
  converted_to_project: "Project Created",
  converted_to_lead: "Lead Created",
  in_progress: "In Progress",
  qa_review: "QA Review",
  awaiting_approval: "Awaiting Approval",
  quote_draft: "Ready to Quote",
  scheduled: "Scheduled",
  completed: "Completed",
  rejected: "Rejected",
  pending: "Pending",
};

export function StatusBadge({
  status,
}: {
  status?: string | null;
}) {
  const normalized = slugifyStatus(status);
  const label = labelMap[status ?? ""] ?? status ?? "Unknown";

  return <span className={`status-badge status-${normalized}`}>{label}</span>;
}
