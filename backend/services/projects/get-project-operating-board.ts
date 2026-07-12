import "server-only";

import { parseLeadExtraction } from "@/frontend/lib/review-drafts";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type ProjectLifecycleStage =
  | "new_enquiry"
  | "qualification"
  | "site_visit"
  | "quote_draft"
  | "awaiting_approval"
  | "scheduled"
  | "in_progress"
  | "qa_review"
  | "invoiced"
  | "completed";

export type ProjectOperatingItem = {
  id: string;
  href: string;
  title: string;
  customerName: string;
  propertyLabel: string;
  workSummary: string;
  stage: ProjectLifecycleStage;
  stageLabel: string;
  sourceLabel: string;
  priority: string;
  assignedTeam: string[];
  scheduledDate: string | null;
  quoteValue: number | null;
  paymentStatus: string;
  health: "Clear" | "On Track" | "Needs Action" | "Blocked";
  unreadMessages: number;
  latestActivityAt: string | null;
  latestActivity: string;
  nextAction: string;
  outstandingIssues: string[];
  searchText: string;
};

export const projectLifecycleStages: Array<{
  status: ProjectLifecycleStage;
  label: string;
}> = [
  { status: "new_enquiry", label: "New Enquiry" },
  { status: "qualification", label: "Qualification" },
  { status: "site_visit", label: "Site Visit" },
  { status: "quote_draft", label: "Quote Draft" },
  { status: "awaiting_approval", label: "Awaiting Approval" },
  { status: "scheduled", label: "Scheduled" },
  { status: "in_progress", label: "In Progress" },
  { status: "qa_review", label: "QA / Review" },
  { status: "invoiced", label: "Invoiced" },
  { status: "completed", label: "Completed" },
];

// Supabase nested selections are intentionally normalized into this view-model.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function list<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function stageLabel(stage: ProjectLifecycleStage): string {
  return projectLifecycleStages.find((item) => item.status === stage)?.label ?? stage;
}

function formatProperty(property?: AnyRecord | null): string {
  if (!property) return "Property not set";

  return [
    property.property_name,
    property.address_line_1,
    property.unit_no,
    property.postal_code,
  ]
    .filter(Boolean)
    .join(", ");
}

function buildSearchText(item: Omit<ProjectOperatingItem, "searchText">): string {
  return [
    item.title,
    item.customerName,
    item.propertyLabel,
    item.workSummary,
    item.stageLabel,
    item.sourceLabel,
    item.priority,
    item.paymentStatus,
    item.health,
    item.nextAction,
    ...item.assignedTeam,
    ...item.outstandingIssues,
  ]
    .join(" ")
    .toLowerCase();
}

function leadStage(lead: AnyRecord): ProjectLifecycleStage {
  if (lead.status_code === "site_visit" || lead.site_visit_required) {
    return "site_visit";
  }

  if (lead.status_code === "new_enquiry") {
    return "new_enquiry";
  }

  return "qualification";
}

function quoteStage(statusCode: string): ProjectLifecycleStage {
  if (["sent", "negotiating", "revised"].includes(statusCode)) {
    return "awaiting_approval";
  }

  return "quote_draft";
}

function projectStage(statusCode: string): ProjectLifecycleStage {
  if (statusCode === "in_progress") return "in_progress";
  if (statusCode === "qa_review") return "qa_review";
  if (statusCode === "invoiced") return "invoiced";
  if (statusCode === "completed") return "completed";
  return "scheduled";
}

function draftStage(statusCode: string): ProjectLifecycleStage {
  return statusCode === "new" ? "new_enquiry" : "qualification";
}

function priorityFromItems(items: AnyRecord[]): string {
  const priorities = items.map((item) => item.priority_code).filter(Boolean);
  if (priorities.includes("urgent")) return "Urgent";
  if (priorities.includes("high")) return "High";
  if (priorities.includes("low")) return "Low";
  return "Normal";
}

function paymentStatusFromProject(project: AnyRecord): string {
  const invoices = list<AnyRecord>(project.invoices);
  const payments = list<AnyRecord>(project.payments);
  const latestInvoice = invoices[0];

  if (latestInvoice?.status_code === "paid" || latestInvoice?.paid_at) return "Paid";
  if (payments.some((payment) => payment.status_code === "verified" || payment.verified_at)) {
    return "Payment recorded";
  }
  if (latestInvoice?.status_code === "overdue") return "Overdue";
  if (latestInvoice) return "Invoiced";
  return "Not invoiced";
}

function nextActionForStage(stage: ProjectLifecycleStage): string {
  const actions: Record<ProjectLifecycleStage, string> = {
    new_enquiry: "Review the enquiry",
    qualification: "Confirm scope and photos",
    site_visit: "Schedule inspection",
    quote_draft: "Review quote draft",
    awaiting_approval: "Follow up with customer",
    scheduled: "Prepare assigned team",
    in_progress: "Track site progress",
    qa_review: "Review completion photos",
    invoiced: "Follow up payment",
    completed: "No action needed",
  };

  return actions[stage];
}

function projectIssues(stage: ProjectLifecycleStage, item: AnyRecord): string[] {
  const issues: string[] = [];
  const projectItems = list<AnyRecord>(item.project_items);
  const openItems = projectItems.filter((projectItem) => projectItem.status_code !== "completed");

  if (["scheduled", "in_progress", "qa_review"].includes(stage) && openItems.length > 0) {
    issues.push(`${openItems.length} open work item${openItems.length === 1 ? "" : "s"}`);
  }

  if (stage === "scheduled" && !item.scheduled_start_at) {
    issues.push("Schedule not set");
  }

  if (stage === "invoiced" && paymentStatusFromProject(item) !== "Paid") {
    issues.push("Payment pending");
  }

  return issues;
}

function healthForItem({
  stage,
  issues,
  paymentStatus,
  scheduledDate,
}: {
  stage: ProjectLifecycleStage;
  issues: string[];
  paymentStatus: string;
  scheduledDate?: string | null;
}): ProjectOperatingItem["health"] {
  if (stage === "completed") return "Clear";
  if (paymentStatus === "Overdue" || issues.some((issue) => issue.toLowerCase().includes("pending"))) {
    return "Blocked";
  }
  if (
    ["new_enquiry", "qualification", "site_visit", "quote_draft", "awaiting_approval", "qa_review", "invoiced"].includes(stage) ||
    (stage === "scheduled" && !scheduledDate)
  ) {
    return "Needs Action";
  }

  return "On Track";
}

export async function getProjectOperatingBoard(): Promise<ProjectOperatingItem[]> {
  const supabase = createAdminSupabaseClient();

  const [draftResult, leadResult, quoteResult, projectResult] = await Promise.all([
    supabase
      .from("review_drafts")
      .select(
        "id, lead_id, approved_project_id, status, extraction_payload, review_notes, created_at, updated_at",
      )
      .in("status", ["new", "ai_processed", "needs_review"])
      .order("created_at", { ascending: false }),
    supabase
      .from("leads")
      .select(
        `
        id,
        title,
        status_code,
        source_channel_code,
        summary,
        customer_request,
        ai_summary,
        site_visit_required,
        received_at,
        last_activity_at,
        created_at,
        updated_at,
        contacts:primary_contact_id (id, full_name, whatsapp_number, primary_phone, email),
        properties:primary_property_id (id, property_name, address_line_1, unit_no, postal_code),
        assigned_profile:assigned_to_profile_id (id, display_name)
      `,
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("quotes")
      .select(
        `
        id,
        lead_id,
        project_id,
        quote_number,
        version_number,
        status_code,
        total_amount,
        sent_at,
        approved_at,
        created_at,
        updated_at,
        leads:lead_id (
          id,
          title,
          customer_request,
          primary_contact_id,
          primary_property_id,
          whatsapp_thread_id,
          contacts:primary_contact_id (id, full_name, whatsapp_number, primary_phone, email),
          properties:primary_property_id (id, property_name, address_line_1, unit_no, postal_code)
        )
      `,
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select(
        `
        id,
        title,
        status_code,
        source_channel_code,
        scope_summary,
        remarks,
        enquiry_at,
        scheduled_start_at,
        scheduled_end_at,
        payment_due_at,
        payment_follow_up_at,
        created_at,
        updated_at,
        contacts:primary_contact_id (id, full_name, whatsapp_number, primary_phone, email),
        properties:primary_property_id (id, property_name, address_line_1, unit_no, postal_code),
        coordinator:coordinator_profile_id (id, display_name),
        project_items (
          id,
          title,
          status_code,
          priority_code,
          quoted_amount,
          assigned_profile:assigned_profile_id (id, display_name)
        ),
        invoices (id, status_code, total_amount, balance_due_amount, due_at, issued_at, paid_at),
        payments (id, status_code, amount, reported_at, verified_at)
      `,
      )
      .order("created_at", { ascending: false }),
  ]);

  if (draftResult.error) throw draftResult.error;
  if (leadResult.error) throw leadResult.error;
  if (quoteResult.error) throw quoteResult.error;
  if (projectResult.error) throw projectResult.error;

  const drafts = (draftResult.data ?? []) as AnyRecord[];
  const leads = (leadResult.data ?? []) as AnyRecord[];
  const quotes = (quoteResult.data ?? []) as AnyRecord[];
  const projects = (projectResult.data ?? []) as AnyRecord[];

  const quoteLeadIds = new Set(quotes.map((quote) => quote.lead_id).filter(Boolean));
  const activeDraftLeadIds = new Set(drafts.map((draft) => draft.lead_id).filter(Boolean));

  const draftItems = drafts
    .filter((draft) => !draft.approved_project_id)
    .map((draft): ProjectOperatingItem => {
      const extraction = parseLeadExtraction(draft.extraction_payload);
      const stage = draftStage(draft.status);
      const operatingId = `draft-${draft.id}`;
      const title =
        extraction.projectTitle ||
        extraction.leadTitle ||
        extraction.issue ||
        "New customer enquiry";
      const base: Omit<ProjectOperatingItem, "searchText"> = {
        id: operatingId,
        href: `/projects/${operatingId}`,
        title,
        customerName: extraction.customerName || "New customer",
        propertyLabel:
          [
            extraction.propertyName,
            extraction.addressLine1 || extraction.address,
            extraction.unitNumber,
            extraction.postalCode,
          ]
            .filter(Boolean)
            .join(", ") || "Property not set",
        workSummary: extraction.issue || extraction.summary || "Customer request needs review",
        stage,
        stageLabel: stageLabel(stage),
        sourceLabel: "Inbox intake",
        priority: "Normal",
        assignedTeam: ["Unassigned"],
        scheduledDate: null,
        quoteValue: null,
        paymentStatus: "Not quoted",
        health: "Needs Action",
        unreadMessages: 0,
        latestActivityAt: draft.updated_at ?? draft.created_at,
        latestActivity: "Intake waiting for review",
        nextAction: nextActionForStage(stage),
        outstandingIssues: ["Needs intake decision"],
      };

      return {
        ...base,
        searchText: buildSearchText(base),
      };
    });

  const leadItems = leads
    .filter((lead) => !quoteLeadIds.has(lead.id) && !activeDraftLeadIds.has(lead.id))
    .map((lead): ProjectOperatingItem => {
      const stage = leadStage(lead);
      const operatingId = `lead-${lead.id}`;
      const contact = first<AnyRecord>(lead.contacts);
      const property = first<AnyRecord>(lead.properties);
      const assignedProfile = first<AnyRecord>(lead.assigned_profile);
      const base: Omit<ProjectOperatingItem, "searchText"> = {
        id: operatingId,
        href: `/projects/${operatingId}`,
        title: lead.title ?? "Customer job",
        customerName: contact?.full_name ?? "Customer not set",
        propertyLabel: formatProperty(property),
        workSummary: lead.customer_request ?? lead.summary ?? lead.ai_summary ?? "Qualification in progress",
        stage,
        stageLabel: stageLabel(stage),
        sourceLabel: "Qualification",
        priority: lead.site_visit_required ? "High" : "Normal",
        assignedTeam: [assignedProfile?.display_name ?? "Unassigned"],
        scheduledDate: null,
        quoteValue: null,
        paymentStatus: "Not quoted",
        health: "Needs Action",
        unreadMessages: 0,
        latestActivityAt: lead.last_activity_at ?? lead.updated_at ?? lead.created_at,
        latestActivity: stage === "site_visit" ? "Site visit required" : "Lead is being qualified",
        nextAction: nextActionForStage(stage),
        outstandingIssues: stage === "site_visit" ? ["Inspection required"] : ["Scope needs confirmation"],
      };

      return {
        ...base,
        searchText: buildSearchText(base),
      };
    });

  const quoteItems = quotes
    .filter((quote) => !quote.project_id && quote.status_code !== "approved")
    .map((quote): ProjectOperatingItem => {
      const lead = first<AnyRecord>(quote.leads);
      const contact = first<AnyRecord>(lead?.contacts);
      const property = first<AnyRecord>(lead?.properties);
      const stage = quoteStage(quote.status_code);
      const operatingId = `quote-${quote.id}`;
      const base: Omit<ProjectOperatingItem, "searchText"> = {
        id: operatingId,
        href: `/projects/${operatingId}`,
        title: lead?.title ?? `Quote version ${quote.version_number}`,
        customerName: contact?.full_name ?? "Customer not set",
        propertyLabel: formatProperty(property),
        workSummary: lead?.customer_request ?? "Quote awaiting review or customer approval",
        stage,
        stageLabel: stageLabel(stage),
        sourceLabel: "Quote",
        priority: stage === "awaiting_approval" ? "High" : "Normal",
        assignedTeam: ["Admin"],
        scheduledDate: null,
        quoteValue: quote.total_amount,
        paymentStatus: "Not invoiced",
        health: "Needs Action",
        unreadMessages: 0,
        latestActivityAt: quote.updated_at ?? quote.created_at,
        latestActivity: stage === "awaiting_approval" ? "Quote sent to customer" : "Draft quote ready",
        nextAction: nextActionForStage(stage),
        outstandingIssues: [stage === "awaiting_approval" ? "Customer approval pending" : "Admin review needed"],
      };

      return {
        ...base,
        searchText: buildSearchText(base),
      };
    });

  const realProjectItems = projects.map((project): ProjectOperatingItem => {
    const contact = first<AnyRecord>(project.contacts);
    const property = first<AnyRecord>(project.properties);
    const coordinator = first<AnyRecord>(project.coordinator);
    const workItems = list<AnyRecord>(project.project_items);
    const itemAssignees = workItems
      .map((item) => first<AnyRecord>(item.assigned_profile)?.display_name)
      .filter(Boolean);
    const team = Array.from(new Set([coordinator?.display_name, ...itemAssignees].filter(Boolean)));
    const quoteValue = workItems.reduce(
      (sum, item) => sum + (typeof item.quoted_amount === "number" ? item.quoted_amount : 0),
      0,
    );
    const stage = projectStage(project.status_code);
    const issues = projectIssues(stage, project);
    const paymentStatus = paymentStatusFromProject(project);
    const base: Omit<ProjectOperatingItem, "searchText"> = {
      id: `project-${project.id}`,
      href: `/projects/${project.id}`,
      title: project.title ?? "Customer job",
      customerName: contact?.full_name ?? "Customer not set",
      propertyLabel: formatProperty(property),
      workSummary: project.scope_summary ?? project.remarks ?? "Project scope not written yet",
      stage,
      stageLabel: stageLabel(stage),
      sourceLabel: "Project",
      priority: priorityFromItems(workItems),
      assignedTeam: team.length > 0 ? team : ["Unassigned"],
      scheduledDate: project.scheduled_start_at,
      quoteValue: quoteValue > 0 ? quoteValue : null,
      paymentStatus,
      health: healthForItem({
        stage,
        issues,
        paymentStatus,
        scheduledDate: project.scheduled_start_at,
      }),
      unreadMessages: 0,
      latestActivityAt: project.updated_at ?? project.created_at,
      latestActivity: issues[0] ?? nextActionForStage(stage),
      nextAction: nextActionForStage(stage),
      outstandingIssues: issues.length > 0 ? issues : ["No blocker"],
    };

    return {
      ...base,
      searchText: buildSearchText(base),
    };
  });

  return [...draftItems, ...leadItems, ...quoteItems, ...realProjectItems].sort((a, b) =>
    (b.latestActivityAt ?? "").localeCompare(a.latestActivityAt ?? ""),
  );
}
