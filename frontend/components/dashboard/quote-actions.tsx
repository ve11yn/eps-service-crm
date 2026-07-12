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
  const [showDelivery, setShowDelivery] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState("manual");
  const [deliveryReference, setDeliveryReference] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  async function updateStatus(nextStatus: string, extra?: Record<string, unknown>) {
    setIsPending(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus, ...extra }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Failed to update quote.");
      }

      router.refresh();
      if (nextStatus === "sent") setShowDelivery(false);
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

  async function createRevision() {
    setIsPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/quotes/${quoteId}/revisions`, { method: "POST" });
      const payload = (await response.json()) as { success?: boolean; error?: string; quoteId?: string | null };
      if (!response.ok || !payload.success || !payload.quoteId) {
        throw new Error(payload.error ?? "Failed to create quote revision.");
      }
      router.push(`/quotes/${payload.quoteId}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create quote revision.");
    } finally {
      setIsPending(false);
    }
  }

  if (projectId) {
    return (
      <div className="inline-actions">
        <a className="button button-secondary" href={`/api/quotes/${quoteId}/pdf`}>
          Download PDF
        </a>
      </div>
    );
  }

  return (
    <div className="inline-actions">
      <a className="button button-secondary" href={`/api/quotes/${quoteId}/pdf`}>
        Download PDF
      </a>
      {status === "draft" ? (
        <button
          type="button"
          className="button button-secondary"
          disabled={isPending}
          onClick={() => setShowDelivery(true)}
        >
          Mark Delivered
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
      {["sent", "negotiating", "revised", "expired_rejected"].includes(status) ? (
        <button type="button" className="button button-primary" disabled={isPending} onClick={createRevision}>
          Create Revision
        </button>
      ) : null}
      {["sent", "negotiating"].includes(status) ? (
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
      {["sent", "negotiating"].includes(status) ? (
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
      {showDelivery ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowDelivery(false)}>
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="quote-delivery-title">
            <div className="panel-header"><div><p className="eyebrow">Delivery evidence</p><h2 id="quote-delivery-title">Confirm quote delivery</h2></div><button type="button" className="button button-secondary" onClick={() => setShowDelivery(false)}>Close</button></div>
            <p className="helper-text">Record how the customer received the quote. A status change alone is not delivery proof.</p>
            <label className="field-block"><span className="field-label">Delivery method</span><select className="select" value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value)}><option value="manual">Manual / in person</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="other">Other</option></select></label>
            <label className="field-block"><span className="field-label">Proof or reference</span><input className="input" value={deliveryReference} onChange={(event) => setDeliveryReference(event.target.value)} placeholder="Message ID, email subject, recipient confirmation, or document reference" /></label>
            <label className="field-block"><span className="field-label">Delivery notes</span><textarea className="textarea" value={deliveryNotes} onChange={(event) => setDeliveryNotes(event.target.value)} /></label>
            <div className="inline-actions"><button type="button" className="button button-secondary" onClick={() => setShowDelivery(false)}>Cancel</button><button type="button" className="button button-primary" disabled={isPending || !deliveryReference.trim()} onClick={() => updateStatus("sent", { deliveryMethod, deliveryReference, deliveryNotes })}>{isPending ? "Saving…" : "Confirm delivery"}</button></div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
