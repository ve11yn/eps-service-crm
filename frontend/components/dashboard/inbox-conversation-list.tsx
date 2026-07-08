"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatChatListTime, getInitials } from "@/frontend/lib/format";
import type { InboxConversationCard, InboxFilterCode } from "@/types/inbox";

const FILTERS: Array<{ code: InboxFilterCode; label: string }> = [
  { code: "open", label: "Open" },
  { code: "needs_review", label: "Needs Review" },
  { code: "assigned", label: "Assigned" },
  { code: "closed", label: "Closed" },
];

export function InboxConversationList({
  threads,
  activeThreadId,
}: {
  threads: InboxConversationCard[];
  activeThreadId: string | null;
}) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<InboxFilterCode | "all">("all");

  const visibleThreads = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return threads.filter((thread) => {
      const matchesFilter = activeFilter === "all" ? true : thread.statusCode === activeFilter;
      const matchesQuery =
        needle.length === 0
          ? true
          : [
              thread.customerName,
              thread.phoneNumber,
              thread.projectType,
              thread.lastMessagePreview,
              thread.projectReference ?? "",
              thread.assignedLabel,
            ]
              .join(" ")
              .toLowerCase()
              .includes(needle);

      return matchesFilter && matchesQuery;
    });
  }, [threads, activeFilter, query]);

  return (
    <div className="inbox-thread-panel">
      <div className="inbox-thread-panel-header">
        <div>
          <p className="eyebrow">WhatsApp Inbox</p>
          <h2>Conversation List</h2>
          <p className="helper-text">
            Manage WhatsApp conversations, project intake, and customer communications.
          </p>
        </div>
      </div>

      <label className="inbox-search">
        <span className="sr-only">Search conversations</span>
        <input
          className="input inbox-search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search conversations..."
        />
      </label>

      <div className="inbox-filter-row" role="tablist" aria-label="Conversation filters">
        <button
          type="button"
          className={`inbox-filter-pill ${activeFilter === "all" ? "is-active" : ""}`}
          onClick={() => setActiveFilter("all")}
        >
          All
        </button>
        {FILTERS.map((filter) => (
          <button
            key={filter.code}
            type="button"
            className={`inbox-filter-pill ${activeFilter === filter.code ? "is-active" : ""}`}
            onClick={() => setActiveFilter(filter.code)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="inbox-thread-list">
        {visibleThreads.length === 0 ? (
          <div className="inbox-empty-list">
            <p className="empty-state-title">No conversations found</p>
            <p className="empty-state-description">
              Try a different search or switch to another status filter.
            </p>
          </div>
        ) : (
          visibleThreads.map((thread) => {
            const active = thread.id === activeThreadId;

            return (
              <Link
                key={thread.id}
                href={`/inbox?thread=${thread.id}`}
                className={`inbox-thread-card ${active ? "is-active" : ""}`}
              >
                <div className="inbox-thread-avatar">{getInitials(thread.customerName)}</div>
                <div className="inbox-thread-copy">
                  <div className="inbox-thread-topline">
                    <div className="inbox-thread-title-group">
                      <p className="inbox-thread-name">{thread.customerName}</p>
                      <p className="inbox-thread-phone">{thread.phoneNumber}</p>
                    </div>
                    <div className="inbox-thread-meta-top">
                      <span className="inbox-thread-time">
                        {formatChatListTime(thread.lastActivityAt)}
                      </span>
                      {thread.unreadCount > 0 ? (
                        <span className="inbox-thread-unread">{thread.unreadCount}</span>
                      ) : null}
                    </div>
                  </div>

                  <p className="inbox-thread-project">{thread.projectType}</p>
                  <p className="inbox-thread-preview">{thread.lastMessagePreview}</p>

                  <div className="inbox-thread-meta-row">
                    <span className={`status-badge status-badge-${thread.statusCode}`}>
                      {thread.statusCode === "needs_review"
                        ? "Needs Review"
                        : thread.statusCode === "assigned"
                          ? "Assigned"
                          : thread.statusCode === "closed"
                            ? "Closed"
                            : "Open"}
                    </span>
                    <span className="inbox-thread-assigned">{thread.assignedLabel}</span>
                    {thread.projectReference ? (
                      <span className="inbox-thread-reference">{thread.projectReference}</span>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
