import { slugifyStatus } from "@/frontend/lib/format";

const labelMap: Record<string, string> = {
  new_enquiry: "New Enquiry",
  qualification: "Qualification",
  site_visit: "Site Visit",
  new: "New",
  ai_processed: "AI Processed",
  needs_review: "Needs Review",
  converted_to_project: "Project Created",
  converted_to_lead: "Lead Created",
  in_progress: "In Progress",
  qa_review: "QA / Review",
  draft: "Draft",
  sent: "Sent",
  negotiating: "Negotiating",
  approved: "Approved",
  revised: "Revised",
  expired_rejected: "Expired/Rejected",
  scheduled: "Scheduled",
  invoiced: "Invoiced",
  issued: "Issued",
  partially_paid: "Partially Paid",
  paid: "Paid",
  overdue: "Overdue",
  deferred: "Deferred",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
  pending: "Pending",
  active: "Active",
  inactive: "Inactive",
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
