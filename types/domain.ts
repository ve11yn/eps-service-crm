// for business/app type 

export type LeadStatus =
  | "new_enquiry"
  | "qualification"
  | "site_visit";

export type ProjectStatus =
  | "scheduled"
  | "in_progress"
  | "qa_review"
  | "invoiced"
  | "completed";

export type QuoteStatus =
  | "draft"
  | "sent"
  | "negotiating"
  | "approved"
  | "revised"
  | "expired_rejected";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "refunded";

export type ProjectItemStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "deferred";

  export type Lead = {
  id: string;
  threadId: string | null;
  contactId: string | null;
  status: LeadStatus;
  latestAiSummary: string | null;
  createdAt: string;
};

export type Project = {
  id: string;
  title: string;
  status: ProjectStatus;
  contactId: string | null;
  propertyId: string | null;
  paymentDueAt: string | null;
  warrantyExpiresAt: string | null;
  createdAt: string;
};

export type ProjectItem = {
  id: string;
  projectId: string;
  title: string;
  status: ProjectItemStatus;
  isAddOn: boolean;
  isPi: boolean;
  isChecklistItem: boolean;
};
