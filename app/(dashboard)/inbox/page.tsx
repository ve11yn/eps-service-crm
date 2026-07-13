/* eslint-disable @next/next/no-img-element */
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
    page?: string;
  }>;
};

function isImportantImportedMessage(message: {
  content: string | null;
  media_caption: string | null;
  message_type_code: string;
  provider_payload: unknown;
}) {
  const provider =
    message.provider_payload &&
    typeof message.provider_payload === "object" &&
    !Array.isArray(message.provider_payload)
      ? (message.provider_payload as Record<string, unknown>)
      : {};
  if (provider.source !== "whatsapp_export") return true;
  if (["image", "video", "document"].includes(message.message_type_code)) return true;

  const text = (message.content ?? message.media_caption ?? "")
    .replace(/[\u2066-\u2069]/g, "")
    .trim();
  if (!text) return false;
  if (/^(ok(?:ay)?|noted|can|yes|no|thanks?|thank you|then pick up you)[.!\s]*$/i.test(text)) return false;
  if (/^you deleted this message$/i.test(text)) return false;
  if (/^@?[^\n]{1,28}$/u.test(text) && /@|eps\s|services/i.test(text)) return false;

  const operational = /date:|time:|client no|full address|site visit|job description|quotation|invoice|payment|done|complete|finish|repair|replace|change|install|remove|dispose|fill|putty|varnish|paint|light|bulb|floor|stair|wall|door|shower|switch|chair|customer|owner|safety|parts?|scope|photo|pic|after|before|address/i;
  return text.length >= 24 || operational.test(text);
}

export default async function InboxPage({ searchParams }: InboxPageProps) {
  await requireAppSession(["owner", "admin"]);
  const params = await searchParams;
  const requestedPage = Math.max(1, Number(params.page) || 1);
  const inbox = await getInboxOverview(params.thread, requestedPage);
  const reviewDraftsByThreadId = inbox.reviewDraftsByThreadId as Record<
    string,
    { status: string; updated_at: string }
  >;
  const projectsByThreadId = inbox.projectsByThreadId as Record<
    string,
    { id: string; project_code: string; title: string; status_code: string }
  >;
  const mediaByMessageId = inbox.mediaByMessageId as Record<
    string,
    Array<{ id: string; media_type: string | null; mime_type: string | null; caption: string | null; signed_url: string | null }>
  >;
  const visibleMessages = inbox.messages.filter(
    (message) =>
      isImportantImportedMessage(message) &&
      (!["image", "video"].includes(message.message_type_code) ||
        (mediaByMessageId[message.id] ?? []).length > 0),
  );

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
              <h2>{inbox.pagination.total} active chats</h2>
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
                const reviewDraft = reviewDraftsByThreadId[thread.id];
                const linkedProject = projectsByThreadId[thread.id];
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
                const status = linkedProject?.status_code ?? reviewDraft?.status ?? "new";
                const chatTime = formatChatListTime(thread.last_message_at ?? thread.updated_at);
                const action = linkedProject
                  ? linkedProject.project_code
                  : reviewDraft
                  ? "Review Intake"
                  : "Run AI Extraction";
                const requestLabel =
                  thread.thread_subject && thread.thread_subject !== contactName
                    ? thread.thread_subject
                    : action;

                return (
                  <Link
                    key={thread.id}
                    href={`/inbox?thread=${thread.id}`}
                    className={`thread-card ${active ? "is-active" : ""}`}
                  >
                    <div className="thread-card-left">
                      <div className="thread-card-avatar">{getInitials(contactName)}</div>
                      <div className="thread-card-body">
                        <p className="thread-card-title">{contactName}</p>
                        <p className="thread-card-subtitle">{profileLabel}</p>
                        <span className="thread-card-request">{requestLabel}</span>
                      </div>
                    </div>
                    <div className="thread-card-side">
                      {chatTime ? <span className="thread-card-time">{chatTime}</span> : null}
                      <StatusBadge status={status} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          {inbox.pagination.totalPages > 1 ? (
            <nav className="inbox-pagination" aria-label="Conversation pages">
              {inbox.pagination.page > 1 ? <Link className="button button-secondary" href={`/inbox?page=${inbox.pagination.page - 1}`}>Previous</Link> : <span />}
              <span className="helper-text">Page {inbox.pagination.page} of {inbox.pagination.totalPages}</span>
              {inbox.pagination.page < inbox.pagination.totalPages ? <Link className="button button-secondary" href={`/inbox?page=${inbox.pagination.page + 1}`}>Next</Link> : <span />}
            </nav>
          ) : null}
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
                    <p className="eyebrow">Operational context</p>
                    <h2>{inbox.activeProject ? "Job Summary" : "Chat Summary"}</h2>
                  </div>
                  {inbox.reviewDraft ? <StatusBadge status={inbox.reviewDraft.status} /> : null}
                </div>

                {inbox.reviewDraft || inbox.activeProject ? (
                  <>
                    <div className="summary-grid">
                      <div>
                        <span className="summary-label">Summary</span>
                        <p>{inbox.activeProject?.completion_summary ?? (inbox.reviewDraft && typeof (inbox.reviewDraft.extraction_payload as { summary?: unknown }).summary === "string"
                          ? (inbox.reviewDraft.extraction_payload as { summary: string }).summary
                          : "Conversation captured in CRM.")}</p>
                      </div>
                      <div>
                        <span className="summary-label">Current record</span>
                        <p>{inbox.activeProject ? `${inbox.activeProject.project_code} · ${inbox.activeProject.status_code.replaceAll("_", " ")}` : inbox.reviewDraft?.review_notes ?? "No review notes."}</p>
                      </div>
                      <div>
                        <span className="summary-label">Conversation status</span>
                        <p>{inbox.reviewDraft?.status ?? "Linked to project"}</p>
                      </div>
                      <div>
                        <span className="summary-label">Last activity</span>
                        <p>{formatDateTime(inbox.activeThread.last_message_at)}</p>
                      </div>
                    </div>
                    <div className="inline-actions">
                      {inbox.activeProject ? <Link className="button button-primary" href={`/projects/${inbox.activeProject.id}`}>Open Project</Link> : null}
                      {inbox.reviewDraft ? <Link className="button button-secondary" href={`/inbox/reviews/${inbox.reviewDraft.id}`}>View Intake Record</Link> : null}
                      {!inbox.activeProject && (!inbox.reviewDraft || ["new", "ai_processed", "needs_review"].includes(inbox.reviewDraft.status)) ? <ProcessThreadDraftButton
                        threadId={inbox.activeThread.id}
                        label="Re-run AI Extraction"
                      /> : null}
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
                  {inbox.hasOlderMessages ? <p className="conversation-limit-note">Showing the latest 200 messages.</p> : null}
                  <p className="conversation-limit-note">Showing important operational updates and available evidence from this export.</p>
                  {visibleMessages.map((message) => (
                    <article
                      key={message.id}
                      className={`message-bubble ${message.direction_code === "outbound" ? "is-outbound" : "is-inbound"}`}
                    >
                      <p className="message-meta">
                        {message.sender_name ?? (message.direction_code === "outbound" ? "Gage Admin" : "Customer")} · {formatDateTime(message.sent_at)}
                      </p>
                      <p>{message.content ?? message.media_caption ?? "Attachment"}</p>
                      {(mediaByMessageId[message.id] ?? []).map((asset) =>
                        asset.media_type === "video" ? (
                          <video key={asset.id} className="message-media" controls preload="metadata" src={asset.signed_url ?? undefined}>
                            <track kind="captions" />
                          </video>
                        ) : (
                          <img key={asset.id} className="message-media" src={asset.signed_url ?? undefined} alt={asset.caption ?? "WhatsApp attachment"} />
                        ),
                      )}
                    </article>
                  ))}
                </div>
              </section>

              {!inbox.activeProject || inbox.activeProject.status_code !== "completed" ? <InboxComposer
                threadId={inbox.activeThread.id}
                suggestedReply={inbox.suggestedReply}
              /> : null}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
