import "server-only";

import { CACHE_TAGS } from "@/lib/cache/cache-tags";
import { cachedQuery } from "@/lib/cache/query-cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const getDashboardOverviewCached = cachedQuery(
  ["dashboard", "overview"],
  async () => {
    const supabase = createAdminSupabaseClient();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    const [
      reviewDraftCountResult,
      activeProjectCountResult,
      completedProjectCountResult,
      scheduledTodayCountResult,
      reviewDraftsResult,
      activeProjectsResult,
      recentProjectsResult,
    ] = await Promise.all([
      supabase
        .from("review_drafts")
        .select("id", { count: "exact", head: true })
        .in("status", ["new", "ai_processed", "needs_review"]),
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .in("status_code", ["scheduled", "in_progress", "qa_review", "invoiced"]),
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("status_code", "completed"),
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_start_at", startOfDay)
        .lt("scheduled_start_at", endOfDay),
      supabase
        .from("review_drafts")
        .select("id, status, created_at, review_notes, extraction_payload, source_channel_code")
        .in("status", ["new", "ai_processed", "needs_review"])
        .order("created_at", { ascending: false })
        .limit(4),
      supabase
        .from("projects")
        .select("id, title, status_code, scheduled_start_at, payment_due_at")
        .in("status_code", ["scheduled", "in_progress", "qa_review", "invoiced"])
        .order("scheduled_start_at", { ascending: true })
        .limit(6),
      supabase
        .from("projects")
        .select("id, project_code, title, status_code, scheduled_start_at, completed_at, updated_at, contacts:primary_contact_id(full_name), invoices(total_amount, balance_due_amount)")
        .order("updated_at", { ascending: false })
        .limit(6),
    ]);

    if (reviewDraftCountResult.error) throw reviewDraftCountResult.error;
    if (activeProjectCountResult.error) throw activeProjectCountResult.error;
    if (completedProjectCountResult.error) throw completedProjectCountResult.error;
    if (scheduledTodayCountResult.error) throw scheduledTodayCountResult.error;
    if (reviewDraftsResult.error) throw reviewDraftsResult.error;
    if (activeProjectsResult.error) throw activeProjectsResult.error;
    if (recentProjectsResult.error) throw recentProjectsResult.error;

    const reviewTasks = (reviewDraftsResult.data ?? []).map((draft) => {
      const extraction =
        draft.extraction_payload &&
        typeof draft.extraction_payload === "object" &&
        !Array.isArray(draft.extraction_payload)
          ? draft.extraction_payload
          : {};

      const title =
        typeof extraction.projectTitle === "string"
          ? extraction.projectTitle
          : typeof extraction.leadTitle === "string"
            ? extraction.leadTitle
            : typeof extraction.issue === "string"
              ? extraction.issue
              : "WhatsApp conversation needs review";

      return {
        id: draft.id,
        type: "review" as const,
        href: `/inbox/reviews/${draft.id}`,
        contextLabel: "Queue",
        contextValue: "Need review",
        title,
        subtitle:
          typeof extraction.customerName === "string" && extraction.customerName.trim()
            ? extraction.customerName
            : draft.source_channel_code === "whatsapp"
              ? "WhatsApp intake"
              : "New intake",
        dueAt: draft.created_at,
        status: draft.status,
        finalValue: "Review intake and confirm CRM fields",
      };
    });

    const projectTasks = (activeProjectsResult.data ?? []).map((project) => ({
      id: project.id,
      type: "project" as const,
      href: `/projects/${project.id}`,
      contextLabel: "Queue",
      contextValue:
        project.status_code === "qa_review"
          ? "QA / Review"
          : project.status_code === "invoiced"
            ? "Invoice follow-up"
            : project.status_code === "in_progress"
              ? "In progress"
              : "Scheduled",
      title: project.title,
      subtitle: "Active project",
      dueAt: project.scheduled_start_at ?? project.payment_due_at ?? null,
      status: project.status_code,
      finalValue:
        project.status_code === "qa_review"
          ? "Check work completion and photos"
          : project.status_code === "invoiced"
            ? "Follow up payment"
            : "Confirm workers, schedule, and materials",
    }));

    const needsAction = [...reviewTasks, ...projectTasks].slice(0, 8);

    return {
      stats: {
        toReview: reviewDraftCountResult.count ?? 0,
        activeProjects: activeProjectCountResult.count ?? 0,
        completedProjects: completedProjectCountResult.count ?? 0,
        scheduledToday: scheduledTodayCountResult.count ?? 0,
      },
      needsAction,
      recentProjects: recentProjectsResult.data ?? [],
    };
  },
  10,
  [CACHE_TAGS.dashboard, CACHE_TAGS.reviewDrafts, CACHE_TAGS.projects],
);

export async function getDashboardOverview() {
  return getDashboardOverviewCached();
}
