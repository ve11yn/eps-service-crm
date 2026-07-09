"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LeadQuoteActionsProps = {
  leadId: string;
  latestQuoteId?: string | null;
};

export function LeadQuoteActions({
  leadId,
  latestQuoteId,
}: LeadQuoteActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function openQuote() {
    if (latestQuoteId) {
      router.push(`/quotes/${latestQuoteId}`);
    }
  }

  async function createQuote() {
    setIsPending(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/leads/${leadId}/quotes`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        quoteId?: string | null;
      };

      if (!response.ok || !payload.success || !payload.quoteId) {
        throw new Error(payload.error ?? "Failed to create draft quote.");
      }

      router.push(`/quotes/${payload.quoteId}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create draft quote.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="inline-actions">
      {latestQuoteId ? (
        <button
          type="button"
          className="button button-primary"
          onClick={openQuote}
        >
          Open Quote
        </button>
      ) : (
        <button
          type="button"
          className="button button-primary"
          disabled={isPending}
          onClick={createQuote}
        >
          {isPending ? "Creating..." : "Create Draft Quote"}
        </button>
      )}
      {message ? <p className="helper-text">{message}</p> : null}
    </div>
  );
}
