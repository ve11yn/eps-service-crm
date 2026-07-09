import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import {
  createMediaAsset,
  getReviewDraftById,
  updateReviewDraft,
} from "@/backend/repositories";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireApiSession } from "@/lib/auth/api";
import { parseLeadExtraction } from "@/frontend/lib/review-drafts";
import type { Json } from "@/types/database";
import type { AiWorkItemMediaAsset } from "@/types/integration";

const MEDIA_BUCKET = "crm-media";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function sanitizeFileName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiSession(["owner", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const formData = await request.formData();
    const itemIndex = Number(formData.get("itemIndex"));
    const file = formData.get("file");

    if (!Number.isInteger(itemIndex) || itemIndex < 0) {
      return NextResponse.json(
        { success: false, error: "Valid itemIndex is required." },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Image file is required." },
        { status: 400 },
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, error: "Only image uploads are supported." },
        { status: 400 },
      );
    }

    const draft = await getReviewDraftById(id);

    if (!draft) {
      return NextResponse.json(
        { success: false, error: "Review draft not found." },
        { status: 404 },
      );
    }

    const extraction = parseLeadExtraction(draft.extraction_payload);
    const workItem = extraction.workItems[itemIndex];

    if (!workItem) {
      return NextResponse.json(
        { success: false, error: "Work item not found on draft." },
        { status: 404 },
      );
    }

    const safeName = sanitizeFileName(file.name) || "work-item-image";
    const storagePath = `review-drafts/${id}/work-items/${itemIndex}/${randomUUID()}-${safeName}`;
    const supabase = createAdminSupabaseClient();
    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const mediaAsset = await createMediaAsset({
      storage_bucket: MEDIA_BUCKET,
      storage_path: storagePath,
      mime_type: file.type,
      media_type: "image",
      evidence_type: "customer_supplied",
      caption: workItem.title || safeName,
      uploaded_by_profile_id: auth.session.profile.id,
    });

    const { data: signedUrlData } = await supabase.storage
      .from(MEDIA_BUCKET)
      .createSignedUrl(storagePath, 60 * 60);

    const storedMediaReference: AiWorkItemMediaAsset = {
      id: mediaAsset.id,
      storageBucket: mediaAsset.storage_bucket,
      storagePath: mediaAsset.storage_path,
      mimeType: mediaAsset.mime_type,
      mediaType: mediaAsset.media_type,
      caption: mediaAsset.caption,
      fileName: file.name,
      signedUrl: null,
    };

    const responseMediaReference: AiWorkItemMediaAsset = {
      ...storedMediaReference,
      signedUrl: signedUrlData?.signedUrl ?? null,
    };

    const nextWorkItems = [...extraction.workItems];
    nextWorkItems[itemIndex] = {
      ...workItem,
      mediaAssets: [...(workItem.mediaAssets ?? []), storedMediaReference],
    };

    const updatedDraft = await updateReviewDraft(id, {
      extraction_payload: {
        ...extraction,
        workItems: nextWorkItems,
      } as unknown as Json,
    });

    return NextResponse.json({
      success: true,
      mediaAsset: responseMediaReference,
      draft: updatedDraft,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.review-drafts.work-item-media",
      error,
      details: { performedByProfileId: auth.session.profile.id },
      status: 400,
    });
  }
}
