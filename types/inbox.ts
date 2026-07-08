import type { Json } from "@/types/database";

export type InboxFilterCode = "open" | "needs_review" | "assigned" | "closed";

export type InboxConversationCard = {
  id: string;
  contactId: string;
  customerName: string;
  phoneNumber: string;
  projectType: string;
  unreadCount: number;
  lastMessagePreview: string;
  lastActivityAt: string | null;
  statusCode: InboxFilterCode;
  projectReference: string | null;
  assignedLabel: string;
};

export type InboxTimelineEntry = {
  label: string;
  detail: string;
  at: string | null;
};

export type InboxProjectInfo = {
  projectId: string | null;
  projectReference: string | null;
  projectType: string;
  customerName: string;
  address: string;
  statusLabel: string;
  priorityLabel: string;
  assignedTeam: string;
};

export type InboxConversationDetails = {
  id: string;
  customerName: string;
  phoneNumber: string;
  statusLabel: string;
  assignedLabel: string;
  projectReference: string | null;
  projectType: string;
  projectInfo: InboxProjectInfo;
  summary: string;
  urgency: string;
  customerRequest: string;
  extractedProblem: string;
  requestedDate: string;
  location: string;
  missingInformation: string[];
  suggestedReply: string;
  reviewDraftId: string | null;
  reviewDraftStatus: string | null;
  reviewDraftNotes: string | null;
  projectId: string | null;
  leadId: string | null;
  contactId: string | null;
  timeline: InboxTimelineEntry[];
  rawExtraction: Json;
};
