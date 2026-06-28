import "server-only";

import {
  getReviewDraftById,
  updateReviewDraft,
} from "@/backend/repositories";
import { logAuditEvent } from "@/backend/observability/audit";

export async function rejectReviewDraft(input: {
  reviewDraftId: string;
  reviewedByProfileId?: string;
  reviewNotes?: string;
  reason?: string;
  markNeedsMoreInfo?: boolean;
  archive?: boolean;
}) {
  const draft = await getReviewDraftById(input.reviewDraftId);

  if (!draft) {
    throw new Error("Review draft not found.");
  }

  const status = input.markNeedsMoreInfo
    ? "needs_review"
    : input.archive
      ? "rejected"
      : "rejected";

  const combinedNotes = [input.reviewNotes, input.reason]
    .filter(Boolean)
    .join("\n\n");

  const updatedDraft = await updateReviewDraft(draft.id, {
    status,
    review_notes: combinedNotes || draft.review_notes,
    reviewed_by_profile_id: input.reviewedByProfileId ?? null,
    reviewed_at: new Date().toISOString(),
    rejected_at: input.markNeedsMoreInfo ? null : new Date().toISOString(),
  });

  await logAuditEvent({
    action: input.markNeedsMoreInfo
      ? "review_drafts.request_more_info"
      : "review_drafts.reject",
    entityType: "review_draft",
    entityId: draft.id,
    performedByProfileId: input.reviewedByProfileId ?? null,
    oldValue: {
      status: draft.status,
      review_notes: draft.review_notes,
    },
    newValue: {
      status: updatedDraft.status,
      review_notes: updatedDraft.review_notes,
    },
  });

  return updatedDraft;
}
