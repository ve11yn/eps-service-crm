export const leadStageLabels: Record<string, string> = {
  new_enquiry: "New Enquiry",
  qualification: "Qualification",
  site_visit: "Site Visit",
};

export const projectStageLabels: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  qa_review: "QA / Review",
  invoiced: "Invoiced",
  completed: "Completed",
};

export const quoteStatusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  negotiating: "Negotiating",
  approved: "Approved",
  revised: "Revised",
  expired_rejected: "Expired/Rejected",
};

export const invoiceStatusLabels: Record<string, string> = {
  draft: "Draft",
  issued: "Issued",
  partially_paid: "Partially Paid",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export const paymentStatusLabels: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  paid: "Paid",
  refunded: "Refunded",
};

export const workItemStatusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  deferred: "Deferred",
};

export const reviewDraftStatusLabels: Record<string, string> = {
  new: "New",
  ai_processed: "AI Processed",
  needs_review: "Needs Review",
  converted_to_project: "Project Created",
  converted_to_lead: "Lead Created",
  rejected: "Rejected",
};

export const statusLabelMap: Record<string, string> = {
  ...leadStageLabels,
  ...projectStageLabels,
  ...quoteStatusLabels,
  ...invoiceStatusLabels,
  ...paymentStatusLabels,
  ...workItemStatusLabels,
  ...reviewDraftStatusLabels,
};

export const projectFilterStatusOptions = [
  { value: "", label: "All statuses" },
  { value: "scheduled", label: projectStageLabels.scheduled },
  { value: "in_progress", label: projectStageLabels.in_progress },
  { value: "qa_review", label: projectStageLabels.qa_review },
  { value: "invoiced", label: projectStageLabels.invoiced },
  { value: "completed", label: projectStageLabels.completed },
];

export const crmLifecycleStages = [
  {
    recordType: "Conversation",
    stage: "WhatsApp intake",
    description: "Customer message, photos, and AI summary are captured.",
  },
  {
    recordType: "Lead",
    stage: leadStageLabels.new_enquiry,
    description: "Initial enquiry is saved before it becomes paid work.",
  },
  {
    recordType: "Lead",
    stage: leadStageLabels.qualification,
    description: "AI or admin decides if more info, a site visit, or quote draft is needed.",
  },
  {
    recordType: "Lead",
    stage: leadStageLabels.site_visit,
    description: "Inspection stays in the lead pipeline until admin confirms the job path.",
  },
  {
    recordType: "Quote",
    stage: quoteStatusLabels.draft,
    description: "Work items are mapped to pricing for human review.",
  },
  {
    recordType: "Quote",
    stage: quoteStatusLabels.approved,
    description: "Customer accepts or admin promotes a confirmed site visit/job.",
  },
  {
    recordType: "Project / Job",
    stage: projectStageLabels.scheduled,
    description: "Only now is the operational job created and assigned.",
  },
  {
    recordType: "Project / Job",
    stage: projectStageLabels.in_progress,
    description: "Worker updates, issue flags, and photos arrive through WhatsApp.",
  },
  {
    recordType: "Project / Job",
    stage: projectStageLabels.qa_review,
    description: "Admin or Gage checks evidence before closeout.",
  },
  {
    recordType: "Invoice",
    stage: invoiceStatusLabels.issued,
    description: "QuickBooks export or sync tracks the final invoice and payment.",
  },
  {
    recordType: "Project / Job",
    stage: projectStageLabels.completed,
    description: "Payment is confirmed and the job is closed.",
  },
] as const;

export const projectPipelineStages = [
  {
    status: "scheduled",
    label: projectStageLabels.scheduled,
    description: "Approved quote or confirmed site visit has been assigned to a slot.",
  },
  {
    status: "in_progress",
    label: projectStageLabels.in_progress,
    description: "Workers are on site and updating through WhatsApp.",
  },
  {
    status: "qa_review",
    label: projectStageLabels.qa_review,
    description: "After photos and completion notes need admin or Gage sign-off.",
  },
  {
    status: "invoiced",
    label: projectStageLabels.invoiced,
    description: "Final invoice is issued and payment is being tracked.",
  },
  {
    status: "completed",
    label: projectStageLabels.completed,
    description: "Payment is received and the job is fully closed.",
  },
] as const;
