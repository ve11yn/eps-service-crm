import "server-only";

import { getReviewDraftById } from "@/backend/repositories";
import { logAuditEvent } from "@/backend/observability/audit";
import { ensureDraftQuoteFromExtraction } from "@/backend/services/quotes/create-draft-quote-from-extraction";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database";
import type { AiLeadExtraction } from "@/types/integration";
import { refreshSecondBrain } from "@/backend/services/ai/second-brain";

type ReviewDraftRow = Database["public"]["Tables"]["review_drafts"]["Row"];

function parseExtraction(payload: Json): AiLeadExtraction {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Review draft extraction payload is invalid.");
  }

  return payload as unknown as AiLeadExtraction;
}

function stripTemporaryMediaUrls(extraction: AiLeadExtraction): AiLeadExtraction {
  return {
    ...extraction,
    workItems: extraction.workItems.map((item) => ({
      ...item,
      mediaAssets: item.mediaAssets?.map((asset) => ({
        ...asset,
        signedUrl: null,
      })),
    })),
  };
}

export async function approveReviewDraft(input: {
  reviewDraftId: string;
  reviewedByProfileId?: string;
  extractionOverride?: AiLeadExtraction;
  createProject?: boolean;
}) {
  const draft = await getReviewDraftById(input.reviewDraftId);

  if (!draft) {
    throw new Error("Review draft not found.");
  }

  const savedExtraction = parseExtraction(draft.extraction_payload);
  const extraction: AiLeadExtraction = {
    ...savedExtraction,
    ...(input.extractionOverride ?? {}),
    shouldCreateProject: false,
  };

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("approve_review_draft_atomic", {
    p_review_draft_id: draft.id,
    p_reviewed_by_profile_id: input.reviewedByProfileId as string,
    p_extraction: stripTemporaryMediaUrls(extraction) as unknown as Json,
    p_create_project: false,
  });

  if (error) throw error;

  const result = Array.isArray(data) ? data[0] : data;

  if (!result) {
    throw new Error("Approval completed without a database result.");
  }

  await logAuditEvent({
    action: "review_drafts.approve",
    entityType: "review_draft",
    entityId: draft.id,
    performedByProfileId: input.reviewedByProfileId ?? null,
    oldValue: {
      status: draft.status,
      lead_id: draft.lead_id,
      approved_project_id: draft.approved_project_id,
    },
    newValue: {
      status: result.status,
      lead_id: result.lead_id,
      approved_project_id: result.project_id,
    },
  });

  if (result.lead_id) {
    await ensureDraftQuoteFromExtraction({
      leadId: result.lead_id,
      createdByProfileId: input.reviewedByProfileId ?? null,
      extraction,
    });
    await refreshSecondBrain("lead", result.lead_id, input.reviewedByProfileId ?? null);
  }

  return {
    reviewDraft: {
      ...draft,
      status: result.status,
      lead_id: result.lead_id,
      approved_project_id: result.project_id,
    } as ReviewDraftRow,
    contact: { id: result.contact_id } as { id: string },
    property: result.property_id ? ({ id: result.property_id } as { id: string }) : null,
    lead: { id: result.lead_id } as { id: string },
    project: null,
  };
}
