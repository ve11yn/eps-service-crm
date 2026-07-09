"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type QuoteActionsProps = {
  quoteId: string;
  status: string;
  projectId?: string | null;
};

export function QuoteActions({
  quoteId,
  status,
  projectId,
}: QuoteActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [scheduledStartAt, setScheduledStartAt] = useState("");
  const [scheduledEndAt, setScheduledEndAt] = useState("");

  async function updateStatus(nextStatus: string) {
    setIsPending(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Failed to update quote.");
      }

      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update quote.");
    } finally {
      setIsPending(false);
    }
  }

  async function approveQuote() {
    if (!scheduledStartAt) {
      setMessage("Choose the project day and time before creating the project.");
      return;
    }

    setIsPending(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/quotes/${quoteId}/approve`, {
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
        throw new Error(payload.error ?? "Failed to approve quote.");
      }

      router.push(`/projects/${payload.projectId}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to approve quote.");
    } finally {
      setIsPending(false);
    }
  }

  if (projectId) {
    return null;
  }

  return (
    <div className="inline-actions">
      {status === "draft" ? (
        <button
          type="button"
          className="button button-secondary"
          disabled={isPending}
          onClick={() => updateStatus("sent")}
        >
          Mark Sent
        </button>
      ) : null}
      {status === "sent" ? (
        <button
          type="button"
          className="button button-secondary"
          disabled={isPending}
          onClick={() => updateStatus("negotiating")}
        >
          Mark Negotiating
        </button>
      ) : null}
      {status === "negotiating" ? (
        <button
          type="button"
          className="button button-secondary"
          disabled={isPending}
          onClick={() => updateStatus("revised")}
        >
          Mark Revised
        </button>
      ) : null}
      {["sent", "negotiating", "revised"].includes(status) ? (
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
            onClick={approveQuote}
          >
            Approve and Create Project
          </button>
        </div>
      ) : null}
      {["sent", "negotiating", "revised"].includes(status) ? (
        <button
          type="button"
          className="button button-secondary"
          disabled={isPending}
          onClick={() => updateStatus("expired_rejected")}
        >
          Expire / Reject
        </button>
      ) : null}
      {message ? <p className="helper-text">{message}</p> : null}
    </div>
  );
}
