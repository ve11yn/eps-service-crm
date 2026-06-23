// for our request and response shape

import type { Json } from "@/types/database";
import type {
  AiConversationMessage,
  AiLeadExtraction,
} from "@/types/integration";
import type { LeadStatus, ProjectStatus } from "@/types/domain";

export type UpdateLeadStatusRequest = {
  leadId: string;
  status: LeadStatus;
};

export type CreateProjectFromLeadRequest = {
  leadId: string;
  title: string;
};

export type UpdateProjectStatusRequest = {
  projectId: string;
  status: ProjectStatus;
};

export type SendWhatsAppMessageRequest = {
  threadId: string;
  text: string;
  to?: string;
  senderName?: string;
};

export type UpsertReviewDraftFromAiRequest = {
  threadId: string;
  leadId?: string;
  contactId?: string;
  propertyId?: string;
  messages: AiConversationMessage[];
  extraction: AiLeadExtraction;
  pricingSuggestions?: Json;
};

export type ApproveReviewDraftRequest = {
  reviewedByProfileId?: string;
  extraction?: AiLeadExtraction;
  createProject?: boolean;
};

export type ProcessConversationToDraftRequest = {
  threadId: string;
  leadId?: string;
  contactId?: string;
  propertyId?: string;
  contactName?: string;
  contactPhone?: string;
  messages?: AiConversationMessage[];
  pricingSuggestions?: Json;
};

export type UpdateReviewDraftRequest = {
  status?: string;
  reviewNotes?: string;
  extraction?: AiLeadExtraction;
  pricingSuggestions?: Json;
  reviewedByProfileId?: string;
};

export type RejectReviewDraftRequest = {
  reviewedByProfileId?: string;
  reviewNotes?: string;
  reason?: string;
  markNeedsMoreInfo?: boolean;
  archive?: boolean;
};
