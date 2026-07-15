"use client";

import Link from "next/link";
import { CalendarClock, ChevronDown, ExternalLink, MapPin, UserRoundCog } from "lucide-react";
import { useState } from "react";
import type { CoordinatorWorkspaceItem } from "@/backend/services/projects/get-coordinator-workspace";
import { ProjectItemAssignment } from "@/frontend/components/dashboard/project-item-assignment";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";
import { formatDateTime } from "@/frontend/lib/format";

export function CoordinatorTaskCard({
  item,
  workers,
  sequence,
  defaultExpanded = false,
}: {
  item: CoordinatorWorkspaceItem;
  workers: Array<{ id: string; displayName: string }>;
  sequence: number;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const normalizedPriority = item.priorityCode.toLowerCase().replaceAll("_", " ");
  const priorityKey = (["low", "normal", "high", "urgent"] as const).find((value) => normalizedPriority.includes(value)) ?? "normal";
  const scheduledAt = item.scheduledStartAt ?? item.project?.scheduledStartAt ?? null;
  const detailsId = `coordinator-task-details-${item.id}`;

  return (
    <article className={`worker-job-card coordinator-task-card priority-${priorityKey} ${item.assignedProfile ? "is-assigned" : "needs-assignment"} ${isExpanded ? "is-expanded" : "is-collapsed"}`}>
      <header className="worker-job-header">
        <button
          type="button"
          className="worker-job-header-toggle"
          aria-expanded={isExpanded}
          aria-controls={isExpanded ? detailsId : undefined}
          onClick={() => setIsExpanded((current) => !current)}
        >
          <div className="worker-job-title-wrap">
            <div className="worker-job-order">{sequence}</div>
            <div>
              <p className="worker-project-code" title={item.project?.title ?? undefined}>
                {item.project?.projectCode ?? "Project task"}
              </p>
              <h3>{item.title}</h3>
              <div className="worker-task-meta" aria-label="Task details">
                <span>{item.areaName ?? "General area"}</span>
                <span className="worker-task-meta-divider" aria-hidden="true">•</span>
                <span className={`worker-task-priority is-${priorityKey}`} data-priority={priorityKey}>
                  {priorityKey} priority
                </span>
              </div>
            </div>
          </div>
          <div className="worker-job-header-actions">
            <span className={`coordinator-card-assignment ${item.assignedProfile ? "is-assigned" : "is-unassigned"}`}>
              {item.assignedProfile ? item.assignedProfile.displayName : "Needs worker"}
            </span>
            <StatusBadge status={item.statusCode} />
            <span className="worker-task-chevron" aria-hidden="true"><ChevronDown size={18} /></span>
          </div>
        </button>
      </header>

      <div className="worker-job-context coordinator-task-context">
        <div><CalendarClock size={17} aria-hidden="true" /><span><small>Scheduled</small><strong>{scheduledAt ? formatDateTime(scheduledAt) : "Date not assigned"}</strong></span></div>
        <div><MapPin size={17} aria-hidden="true" /><span><small>Location</small><strong>{item.project?.address ?? "Address not recorded"}</strong></span></div>
        <div><UserRoundCog size={17} aria-hidden="true" /><span><small>Assigned worker</small><strong>{item.assignedProfile?.displayName ?? "Needs a worker"}</strong></span></div>
        {item.project ? (
          <Link href={`/projects/${item.project.id}`}>Open job <ExternalLink size={15} aria-hidden="true" /></Link>
        ) : null}
      </div>

      {isExpanded ? (
      <div id={detailsId} className="worker-job-details">
        <section className="coordinator-assignment-panel" aria-label={`Assign ${item.title}`}>
          <header className="worker-action-card-header coordinator-assignment-header">
            <div>
              <span><strong>Assignment and schedule</strong><small>Choose the worker and confirm the task timing.</small></span>
            </div>
          </header>
          <ProjectItemAssignment
            itemId={item.id}
            workers={workers}
            initialAssignedProfileId={item.assignedProfile?.id ?? null}
            initialBeforeAfterRequired={item.beforeAfterRequired}
            initialScheduledStartAt={item.scheduledStartAt}
            initialScheduledDueAt={item.scheduledDueAt}
          />
        </section>

      </div>
      ) : null}
    </article>
  );
}
