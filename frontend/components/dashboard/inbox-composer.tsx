"use client";

import { useState } from "react";

export function InboxComposer({
  threadId,
  suggestedReply,
}: {
  threadId: string;
  suggestedReply?: string;
}) {
  const [message, setMessage] = useState(suggestedReply ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function handleSend() {
    if (!message.trim()) {
      setStatus("Message is empty.");
      return;
    }

    setIsSending(true);
    setStatus(null);

    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadId,
          text: message.trim(),
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Failed to send message.");
      }

      setStatus("Message sent.");
      setMessage("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="panel inbox-composer">
      <label className="field-label" htmlFor="reply-message">
        Reply
      </label>
      <textarea
        id="reply-message"
        className="composer-textarea"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Write a reply for the customer..."
        rows={5}
      />
      <div className="composer-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={() => setMessage(suggestedReply ?? "")}
        >
          Use suggested reply
        </button>
        <button
          type="button"
          className="button button-primary"
          onClick={handleSend}
          disabled={isSending}
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </div>
      {status ? <p className="helper-text">{status}</p> : null}
    </div>
  );
}
