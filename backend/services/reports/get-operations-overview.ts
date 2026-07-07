import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type SourceBreakdown = {
  code: string;
  label: string;
  count: number;
  share: number;
};

type WorkloadRow = {
  profileId: string;
  displayName: string;
  roleCode: string;
  assignedLeadCount: number;
  assignedItemCount: number;
  openItemCount: number;
};

export async function getOperationsOverview() {
  const supabase = createAdminSupabaseClient();

  const [leadsResult, sourceChannelsResult, messagesResult, profilesResult, projectItemsResult] =
    await Promise.all([
      supabase
        .from("leads")
        .select("id, source_channel_code, status_code, received_at, last_activity_at, assigned_to_profile_id"),
      supabase.from("source_channels").select("code, label"),
      supabase.from("messages").select("thread_id, direction_code, sent_at"),
      supabase.from("profiles").select("id, display_name, role_code"),
      supabase
        .from("project_items")
        .select("assigned_profile_id, status_code, is_deferred, deferred_reason"),
    ]);

  for (const result of [
    leadsResult,
    sourceChannelsResult,
    messagesResult,
    profilesResult,
    projectItemsResult,
  ]) {
    if (result.error) throw result.error;
  }

  const sourceLabels = new Map(
    (sourceChannelsResult.data ?? []).map((channel) => [channel.code, channel.label]),
  );

  const sourceCounts = new Map<string, number>();
  const leads = leadsResult.data ?? [];
  for (const lead of leads) {
    sourceCounts.set(
      lead.source_channel_code,
      (sourceCounts.get(lead.source_channel_code) ?? 0) + 1,
    );
  }

  const sourceBreakdown: SourceBreakdown[] = Array.from(sourceCounts.entries())
    .map(([code, count]) => ({
      code,
      label: sourceLabels.get(code) ?? code,
      count,
      share: leads.length > 0 ? count / leads.length : 0,
    }))
    .sort((left, right) => right.count - left.count);

  const convertedLeads = leads.filter((lead) => lead.status_code === "converted");
  const conversionRate = leads.length > 0 ? convertedLeads.length / leads.length : 0;

  const threadStats = new Map<
    string,
    { firstInbound: string | null; firstOutbound: string | null }
  >();

  for (const message of messagesResult.data ?? []) {
    const current = threadStats.get(message.thread_id) ?? {
      firstInbound: null,
      firstOutbound: null,
    };

    if (message.direction_code === "inbound") {
      current.firstInbound =
        current.firstInbound && current.firstInbound < message.sent_at
          ? current.firstInbound
          : message.sent_at;
    } else {
      current.firstOutbound =
        current.firstOutbound && current.firstOutbound < message.sent_at
          ? current.firstOutbound
          : message.sent_at;
    }

    threadStats.set(message.thread_id, current);
  }

  const responseSamples: number[] = [];
  for (const stat of threadStats.values()) {
    if (!stat.firstInbound || !stat.firstOutbound) continue;

    const inboundTime = new Date(stat.firstInbound).getTime();
    const outboundTime = new Date(stat.firstOutbound).getTime();
    if (Number.isNaN(inboundTime) || Number.isNaN(outboundTime) || outboundTime < inboundTime) {
      continue;
    }

    responseSamples.push((outboundTime - inboundTime) / 60000);
  }

  const averageResponseMinutes =
    responseSamples.length > 0
      ? responseSamples.reduce((sum, value) => sum + value, 0) / responseSamples.length
      : null;

  const sortedResponseSamples = [...responseSamples].sort((left, right) => left - right);
  const medianResponseMinutes =
    sortedResponseSamples.length > 0
      ? sortedResponseSamples[Math.floor(sortedResponseSamples.length / 2)]
      : null;

  const workloadByProfile = new Map<string, WorkloadRow>();
  for (const profile of profilesResult.data ?? []) {
    workloadByProfile.set(profile.id, {
      profileId: profile.id,
      displayName: profile.display_name,
      roleCode: profile.role_code,
      assignedLeadCount: leads.filter((lead) => lead.assigned_to_profile_id === profile.id).length,
      assignedItemCount: 0,
      openItemCount: 0,
    });
  }

  for (const item of projectItemsResult.data ?? []) {
    if (!item.assigned_profile_id) continue;
    const row = workloadByProfile.get(item.assigned_profile_id);
    if (!row) continue;

    row.assignedItemCount += 1;
    if (!["completed", "cancelled"].includes(item.status_code)) {
      row.openItemCount += 1;
    }
  }

  const workload = Array.from(workloadByProfile.values())
    .filter((row) => row.roleCode !== "owner")
    .sort((left, right) => right.openItemCount - left.openItemCount);

  const projectItems = projectItemsResult.data ?? [];
  const reworkItems = projectItems.filter(
    (item) => item.is_deferred || item.status_code === "deferred" || item.deferred_reason,
  ).length;
  const reworkRate = projectItems.length > 0 ? reworkItems / projectItems.length : 0;
  const topSource = sourceBreakdown[0] ?? null;
  const busiestMember = workload[0] ?? null;
  const responseLabel =
    averageResponseMinutes === null
      ? "No response samples yet"
      : averageResponseMinutes <= 30
        ? "Fast response"
        : averageResponseMinutes <= 120
          ? "Moderate response"
          : "Slow response";
  const reworkLabel =
    reworkRate <= 0.05 ? "Low rework" : reworkRate <= 0.15 ? "Moderate rework" : "High rework";

  return {
    leadSourceBreakdown: sourceBreakdown,
    conversion: {
      totalLeads: leads.length,
      convertedLeads: convertedLeads.length,
      conversionRate,
    },
    response: {
      responseSamples: responseSamples.length,
      averageResponseMinutes,
      medianResponseMinutes,
    },
    workload,
    rework: {
      totalItems: projectItems.length,
      reworkItems,
      reworkRate,
    },
    insights: {
      topSource,
      busiestMember,
      responseLabel,
      reworkLabel,
    },
  };
}
