"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LeadActionsProps = {
  leadId: string;
  status: string;
};

export function LeadActions({ leadId, status }: LeadActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [scheduledStartAt, setScheduledStartAt] = useState("");
  const [scheduledEndAt, setScheduledEndAt] = useState("");

  async function confirmSiteVisit() {
    if (!scheduledStartAt) {
      setMessage("Choose the project day and time before creating the project.");
      return;
    }

    setIsPending(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/leads/${leadId}/confirm-site-visit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scheduledStartAt,
          scheduledEndAt: scheduledEndAt || null,
        }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        projectId?: string | null;
      };

      if (!response.ok || !payload.success || !payload.projectId) {
        throw new Error(payload.error ?? "Failed to create project.");
      }

      router.push(`/projects/${payload.projectId}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create project.");
    } finally {
      setIsPending(false);
    }
  }

  if (status !== "site_visit") {
    return null;
  }

  return (
    <div className="inline-actions">
      <div className="schedule-create-controls">
        <label className="field-block">
          <span className="field-label">Project Start</span>
          <input
            className="input"
            type="datetime-local"
            value={scheduledStartAt}
            onChange={(event) => setScheduledStartAt(event.target.value)}
            required
          />
        </label>
        <label className="field-block">
          <span className="field-label">Project End</span>
          <input
            className="input"
            type="datetime-local"
            value={scheduledEndAt}
            onChange={(event) => setScheduledEndAt(event.target.value)}
          />
        </label>
      <button
        type="button"
        className="button button-primary"
        disabled={isPending || !scheduledStartAt}
        onClick={confirmSiteVisit}
      >
        Confirm Site Visit and Create Project
      </button>
      </div>
      {message ? <p className="helper-text">{message}</p> : null}
    </div>
  );
}
