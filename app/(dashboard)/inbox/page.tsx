import Link from "next/link";
import { getInboxOverview } from "@/backend/services/inbox/get-inbox-overview";
import { EmptyState } from "@/frontend/components/dashboard/empty-state";
import { InboxComposer } from "@/frontend/components/dashboard/inbox-composer";
import { ProcessThreadDraftButton } from "@/frontend/components/dashboard/process-thread-draft-button";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";
import { formatChatListTime, formatDateTime, getInitials } from "@/frontend/lib/format";
import { requireAppSession } from "@/lib/auth/session";

type InboxPageProps = {
  searchParams: Promise<{
    thread?: string;
  }>;
};

export default async function InboxPage({ searchParams }: InboxPageProps) {
  await requireAppSession(["owner", "admin"]);
  const params = await searchParams;
  const inbox = await getInboxOverview(params.thread);

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <h1>Inbox</h1>
        </div>
      
      </section>

      <section className="inbox-layout">
        <aside className="panel inbox-list">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Threads</p>
              <h2>{inbox.threads.length} active chats</h2>
            </div>
          </div>

          {inbox.threads.length === 0 ? (
            <EmptyState
              title="No chat threads yet"
              description="Once WhatsApp messages are saved into Supabase, they will appear here."
            />
          ) : (
            <div className="thread-list">
              {inbox.threads.map((thread) => {
                const active = inbox.activeThread?.id === thread.id;
                const contact = Array.isArray(thread.contacts)
                  ? thread.contacts[0]
                  : thread.contacts;
                const contactName =
                  contact?.full_name ?? thread.thread_subject ?? "WhatsApp thread";
                const profileLabel =
                  contact?.whatsapp_number ??
                  contact?.primary_phone ??
                  contact?.email ??
                  thread.thread_subject ??
                  "WhatsApp contact";
                const chatTime = formatChatListTime(thread.last_message_at);

                return (
                  <Link
                    key={thread.id}
                    href={`/inbox?thread=${thread.id}`}
                    className={`thread-card ${active ? "is-active" : ""}`}
                  >
                    <div className="thread-card-avatar">{getInitials(contactName)}</div>
                    <div className="thread-card-body">
                      <div className="thread-card-contact-row">
                        <p className="thread-card-title">{contactName}</p>
                        <p className="thread-card-subtitle">{profileLabel}</p>
                      </div>
                      <div className="thread-card-meta-column">
                        {chatTime ? <span className="thread-card-time">{chatTime}</span> : null}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </aside>

        <div className="page-stack inbox-detail">
          {!inbox.activeThread ? (
            <div className="panel inbox-empty">
              <EmptyState
                title="Select a conversation"
                description="Choose a thread on the left to view the chat and AI summary."
              />
            </div>
          ) : (
            <>
              <section className="panel inbox-ai-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">AI Intake</p>
                    <h2>Chat Summary</h2>
                  </div>
                  {inbox.reviewDraft ? <StatusBadge status={inbox.reviewDraft.status} /> : null}
                </div>

                {inbox.reviewDraft ? (
                  <>
                    <div className="summary-grid">
                      <div>
                        <span className="summary-label">Summary</span>
                        <p>{typeof (inbox.reviewDraft.extraction_payload as { summary?: unknown }).summary === "string"
                          ? (inbox.reviewDraft.extraction_payload as { summary: string }).summary
                          : "No summary yet"}</p>
                      </div>
                      <div>
                        <span className="summary-label">Missing / Notes</span>
                        <p>{inbox.reviewDraft.review_notes ?? "No review notes yet."}</p>
                      </div>
                      <div>
                        <span className="summary-label">Draft</span>
                        <p>{inbox.reviewDraft.id}</p>
                      </div>
                      <div>
                        <span className="summary-label">Updated</span>
                        <p>{formatDateTime(inbox.reviewDraft.updated_at)}</p>
                      </div>
                    </div>
                    <div className="inline-actions">
                      <Link className="button button-primary" href={`/inbox/reviews/${inbox.reviewDraft.id}`}>
                        Review Intake
                      </Link>
                      <ProcessThreadDraftButton
                        threadId={inbox.activeThread.id}
                        label="Re-run AI Extraction"
                      />
                    </div>
                  </>
                ) : (
                  <div className="page-stack">
                    <EmptyState
                      title="No AI review draft yet"
                      description="Generate a structured draft from this conversation, then review and approve it."
                    />
                    <ProcessThreadDraftButton threadId={inbox.activeThread.id} />
                  </div>
                )}
              </section>

              <section className="panel inbox-conversation-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Conversation</p>
                    <h2>{inbox.activeThread.thread_subject ?? "Chat thread"}</h2>
                  </div>
                  <span className="helper-text">
                    Last activity {formatDateTime(inbox.activeThread.last_message_at)}
                  </span>
                </div>

                <div className="message-list">
                  {inbox.messages.map((message) => (
                    <article
                      key={message.id}
                      className={`message-bubble ${message.direction_code === "outbound" ? "is-outbound" : "is-inbound"}`}
                    >
                      <p className="message-meta">
                        {message.sender_name ?? (message.direction_code === "outbound" ? "Gage Admin" : "Customer")} · {formatDateTime(message.sent_at)}
                      </p>
                      <p>{message.content ?? message.media_caption ?? "Attachment"}</p>
                    </article>
                  ))}
                </div>
              </section>

              <InboxComposer
                threadId={inbox.activeThread.id}
                suggestedReply={inbox.suggestedReply}
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
