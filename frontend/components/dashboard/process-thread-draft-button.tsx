"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProcessThreadDraftButton({
  threadId,
  label = "Generate AI Draft",
}: {
  threadId: string;
  label?: string;
}) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleProcess() {
    setIsProcessing(true);
    setStatus(null);

    try {
      const response = await fetch("/api/review-drafts/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadId,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        reviewDraftId?: string;
      };

      if (!response.ok || !payload.success || !payload.reviewDraftId) {
        throw new Error(payload.error ?? "Failed to generate review draft.");
      }

      router.push(`/reviews/${payload.reviewDraftId}`);
      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to generate review draft.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="action-stack">
      <button
        type="button"
        className="button button-primary"
        onClick={handleProcess}
        disabled={isProcessing}
      >
        {isProcessing ? "Generating..." : label}
      </button>
      {status ? <p className="helper-text">{status}</p> : null}
    </div>
  );
}
