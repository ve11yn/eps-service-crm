"use client";

import { useState } from "react";

type InboxMediaProps = {
  url: string | null;
  mediaType: string | null;
  mimeType: string | null;
  caption: string | null;
};

export function InboxMedia({ url, mediaType, mimeType, caption }: InboxMediaProps) {
  const [failed, setFailed] = useState(false);
  const label = caption?.trim() || (mediaType === "video" ? "WhatsApp video" : "WhatsApp image");

  if (!url || failed) {
    return (
      <div className="message-media-fallback">
        <strong>{label}</strong>
        <span>The attachment could not be loaded. Refresh the conversation to request a new secure link.</span>
      </div>
    );
  }

  if (mediaType === "video" || mimeType?.startsWith("video/")) {
    return (
      <video
        className="message-media"
        controls
        preload="metadata"
        src={url}
        onError={() => setFailed(true)}
      >
        <track kind="captions" />
      </video>
    );
  }

  return (
    <a className="message-media-link" href={url} target="_blank" rel="noreferrer" aria-label={`Open ${label}`}>
      {/* A signed Supabase URL is generated on every Inbox request. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="message-media" src={url} alt={label} onError={() => setFailed(true)} />
    </a>
  );
}
