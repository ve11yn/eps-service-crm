import "server-only";

import { listProjects } from "@/backend/repositories";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const evidencePriority: Record<string, number> = {
  customer_supplied: 0,
  before: 1,
  after: 2,
  during: 3,
  defect: 4,
  materials: 5,
  access: 6,
  marked_up: 7,
};

export async function listProjectsWithCoverImages() {
  const projects = await listProjects();
  if (projects.length === 0) return [];

  const supabase = createAdminSupabaseClient();
  const { data: assets, error } = await supabase
    .from("media_assets")
    .select("id, project_id, storage_bucket, storage_path, evidence_type, caption, captured_at, created_at")
    .in("project_id", projects.map((project) => project.id))
    .eq("media_type", "image")
    .order("captured_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) throw error;

  const coverByProject = new Map<string, NonNullable<typeof assets>[number]>();
  for (const asset of assets ?? []) {
    if (!asset.project_id) continue;
    const existing = coverByProject.get(asset.project_id);
    const assetPriority = evidencePriority[asset.evidence_type ?? ""] ?? 99;
    const existingPriority = existing
      ? evidencePriority[existing.evidence_type ?? ""] ?? 99
      : Number.POSITIVE_INFINITY;
    if (!existing || assetPriority < existingPriority) coverByProject.set(asset.project_id, asset);
  }

  const covers = Array.from(coverByProject.values());
  const signedUrlByAssetId = new Map<string, string>();
  const coversByBucket = new Map<string, typeof covers>();
  for (const cover of covers) {
    const group = coversByBucket.get(cover.storage_bucket) ?? [];
    group.push(cover);
    coversByBucket.set(cover.storage_bucket, group);
  }

  await Promise.all(
    Array.from(coversByBucket.entries()).map(async ([bucket, bucketCovers]) => {
      const { data, error: signedUrlError } = await supabase.storage
        .from(bucket)
        .createSignedUrls(bucketCovers.map((cover) => cover.storage_path), 60 * 60);
      if (signedUrlError) {
        console.error("[projects.cover_sign]", { bucket, error: signedUrlError.message });
        return;
      }
      for (const [index, result] of (data ?? []).entries()) {
        const cover = bucketCovers[index];
        if (cover && result.signedUrl) signedUrlByAssetId.set(cover.id, result.signedUrl);
      }
    }),
  );

  return projects.map((project) => {
    const cover = coverByProject.get(project.id);
    return {
      ...project,
      coverImageUrl: cover ? signedUrlByAssetId.get(cover.id) ?? null : null,
      coverImageAlt: cover?.caption?.trim() || `${project.title} project photo`,
    };
  });
}
