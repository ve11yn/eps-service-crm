"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/frontend/lib/format";
import {
  listToText,
  parseConversationMessages,
  parseLeadExtraction,
  textToList,
} from "@/frontend/lib/review-drafts";
import type { Database } from "@/types/database";
import type { AiLeadExtraction } from "@/types/integration";

type ReviewDraftRow = Database["public"]["Tables"]["review_drafts"]["Row"];

type ReviewDraftEditorProps = {
  draft: ReviewDraftRow;
};

function normalizeConfidence(value: string): number {
  const parsed = Number(value);

  if (Number.isNaN(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > 1) return 1;

  return parsed;
}

export function ReviewDraftEditor({ draft }: ReviewDraftEditorProps) {
  const router = useRouter();
  const [extraction, setExtraction] = useState<AiLeadExtraction>(() =>
    parseLeadExtraction(draft.extraction_payload),
  );
  const [reviewNotes, setReviewNotes] = useState(draft.review_notes ?? "");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const conversation = useMemo(
    () => parseConversationMessages(draft.raw_conversation),
    [draft.raw_conversation],
  );

  function patchExtraction(patch: Partial<AiLeadExtraction>) {
    setExtraction((current) => ({
      ...current,
      ...patch,
    }));
  }

  async function saveDraft(nextStatus = "needs_review") {
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/review-drafts/${draft.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
          reviewNotes,
          extraction,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Failed to save review draft.");
      }

      setStatusMessage("Draft saved.");
      router.refresh();
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to save review draft.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function approveDraft() {
    setIsApproving(true);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/review-drafts/${draft.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          extraction,
          createProject: extraction.shouldCreateProject,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        projectId?: string | null;
        leadId?: string | null;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Failed to approve review draft.");
      }

      if (payload.projectId) {
        router.push(`/projects/${payload.projectId}`);
      } else {
        router.push("/reviews");
      }
      router.refresh();
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to approve review draft.",
      );
    } finally {
      setIsApproving(false);
    }
  }

  async function rejectDraft(markNeedsMoreInfo: boolean) {
    setIsRejecting(true);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/review-drafts/${draft.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewNotes,
          reason: reviewNotes,
          markNeedsMoreInfo,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.error ??
            `Failed to ${markNeedsMoreInfo ? "request more info" : "reject"} draft.`,
        );
      }

      router.push("/reviews");
      router.refresh();
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : `Failed to ${markNeedsMoreInfo ? "request more info" : "reject"} draft.`,
      );
    } finally {
      setIsRejecting(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Review Draft</p>
          <h1>Review Intake</h1>
        </div>
        <p className="page-header-copy">
          Confirm the extracted details, correct anything unclear, then decide whether this conversation stays as a lead or becomes a project.
        </p>
      </section>

      <section className="review-layout">
        <div className="page-stack">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Core Details</p>
                <h2>Customer and Job</h2>
              </div>
              <span className="helper-text">
                Updated {formatDateTime(draft.updated_at)}
              </span>
            </div>

            <div className="form-grid">
              <label className="field-block">
                <span className="field-label">Project Title</span>
                <input
                  className="input"
                  value={extraction.projectTitle ?? ""}
                  onChange={(event) =>
                    patchExtraction({ projectTitle: event.target.value })
                  }
                />
              </label>

              <label className="field-block">
                <span className="field-label">Lead Title</span>
                <input
                  className="input"
                  value={extraction.leadTitle ?? ""}
                  onChange={(event) =>
                    patchExtraction({ leadTitle: event.target.value })
                  }
                />
              </label>

              <label className="field-block">
                <span className="field-label">Customer Name</span>
                <input
                  className="input"
                  value={extraction.customerName ?? ""}
                  onChange={(event) =>
                    patchExtraction({ customerName: event.target.value })
                  }
                />
              </label>

              <label className="field-block">
                <span className="field-label">Phone</span>
                <input
                  className="input"
                  value={extraction.contactPhone ?? ""}
                  onChange={(event) =>
                    patchExtraction({ contactPhone: event.target.value })
                  }
                />
              </label>

              <label className="field-block">
                <span className="field-label">Alternate Phone</span>
                <input
                  className="input"
                  value={extraction.alternatePhone ?? ""}
                  onChange={(event) =>
                    patchExtraction({ alternatePhone: event.target.value })
                  }
                />
              </label>

              <label className="field-block">
                <span className="field-label">Email</span>
                <input
                  className="input"
                  value={extraction.email ?? ""}
                  onChange={(event) =>
                    patchExtraction({ email: event.target.value })
                  }
                />
              </label>

              <label className="field-block">
                <span className="field-label">Urgency</span>
                <select
                  className="input input-select"
                  value={extraction.urgency}
                  onChange={(event) =>
                    patchExtraction({
                      urgency: event.target.value as AiLeadExtraction["urgency"],
                    })
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>

              <label className="field-block">
                <span className="field-label">Customer Type</span>
                <select
                  className="input input-select"
                  value={extraction.customerType ?? ""}
                  onChange={(event) =>
                    patchExtraction({
                      customerType: event.target.value
                        ? (event.target.value as AiLeadExtraction["customerType"])
                        : undefined,
                    })
                  }
                >
                  <option value="">Empty</option>
                  <option value="owner">Owner</option>
                  <option value="tenant">Tenant</option>
                  <option value="landlord">Landlord</option>
                  <option value="agent">Agent</option>
                </select>
              </label>

              <label className="field-block">
                <span className="field-label">Confidence</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={String(extraction.confidence ?? 0)}
                  onChange={(event) =>
                    patchExtraction({
                      confidence: normalizeConfidence(event.target.value),
                    })
                  }
                />
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Location and Scope</p>
                <h2>Address, Service, and Notes</h2>
              </div>
            </div>

            <div className="form-grid">
              <label className="field-block field-block-wide">
                <span className="field-label">Summary</span>
                <textarea
                  className="composer-textarea"
                  rows={4}
                  value={extraction.summary}
                  onChange={(event) =>
                    patchExtraction({ summary: event.target.value })
                  }
                />
              </label>

              <label className="field-block field-block-wide">
                <span className="field-label">Issue</span>
                <textarea
                  className="composer-textarea"
                  rows={3}
                  value={extraction.issue ?? ""}
                  onChange={(event) =>
                    patchExtraction({ issue: event.target.value })
                  }
                />
              </label>

              <label className="field-block">
                <span className="field-label">Address</span>
                <input
                  className="input"
                  value={extraction.address ?? ""}
                  onChange={(event) =>
                    patchExtraction({ address: event.target.value })
                  }
                />
              </label>

              <label className="field-block">
                <span className="field-label">Address Line 1</span>
                <input
                  className="input"
                  value={extraction.addressLine1 ?? ""}
                  onChange={(event) =>
                    patchExtraction({ addressLine1: event.target.value })
                  }
                />
              </label>

              <label className="field-block">
                <span className="field-label">Unit Number</span>
                <input
                  className="input"
                  value={extraction.unitNumber ?? ""}
                  onChange={(event) =>
                    patchExtraction({ unitNumber: event.target.value })
                  }
                />
              </label>

              <label className="field-block">
                <span className="field-label">Postal Code</span>
                <input
                  className="input"
                  value={extraction.postalCode ?? ""}
                  onChange={(event) =>
                    patchExtraction({ postalCode: event.target.value })
                  }
                />
              </label>

              <label className="field-block">
                <span className="field-label">Property Name</span>
                <input
                  className="input"
                  value={extraction.propertyName ?? ""}
                  onChange={(event) =>
                    patchExtraction({ propertyName: event.target.value })
                  }
                />
              </label>

              <label className="field-block">
                <span className="field-label">Access Notes</span>
                <input
                  className="input"
                  value={extraction.accessNotes ?? ""}
                  onChange={(event) =>
                    patchExtraction({ accessNotes: event.target.value })
                  }
                />
              </label>

              <label className="field-block">
                <span className="field-label">Preferred Date</span>
                <input
                  className="input"
                  value={extraction.preferredDate ?? ""}
                  onChange={(event) =>
                    patchExtraction({ preferredDate: event.target.value })
                  }
                />
              </label>

              <label className="field-block">
                <span className="field-label">Preferred Time Window</span>
                <input
                  className="input"
                  value={extraction.preferredTimeWindow ?? ""}
                  onChange={(event) =>
                    patchExtraction({ preferredTimeWindow: event.target.value })
                  }
                />
              </label>

              <label className="field-block field-block-wide">
                <span className="field-label">Requested Services</span>
                <input
                  className="input"
                  value={listToText(extraction.requestedServices)}
                  onChange={(event) =>
                    patchExtraction({
                      requestedServices: textToList(event.target.value),
                    })
                  }
                />
              </label>

              <label className="field-block field-block-wide">
                <span className="field-label">Labels</span>
                <input
                  className="input"
                  value={listToText(extraction.labels)}
                  onChange={(event) =>
                    patchExtraction({
                      labels: textToList(event.target.value),
                    })
                  }
                />
              </label>

              <label className="field-block field-block-wide">
                <span className="field-label">Scope Summary</span>
                <textarea
                  className="composer-textarea"
                  rows={3}
                  value={extraction.scopeSummary ?? ""}
                  onChange={(event) =>
                    patchExtraction({ scopeSummary: event.target.value })
                  }
                />
              </label>

              <label className="field-block field-block-wide">
                <span className="field-label">Remarks</span>
                <textarea
                  className="composer-textarea"
                  rows={3}
                  value={extraction.remarks ?? ""}
                  onChange={(event) =>
                    patchExtraction({ remarks: event.target.value })
                  }
                />
              </label>
            </div>

            <div className="toggle-row">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={extraction.siteVisitRequired}
                  onChange={(event) =>
                    patchExtraction({ siteVisitRequired: event.target.checked })
                  }
                />
                <span>Site visit required</span>
              </label>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={extraction.shouldCreateProject}
                  onChange={(event) =>
                    patchExtraction({
                      shouldCreateProject: event.target.checked,
                    })
                  }
                />
                <span>Create project on approval</span>
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Work Items</p>
                <h2>Planned Scope</h2>
              </div>
              <button
                type="button"
                className="button button-secondary"
                onClick={() =>
                  patchExtraction({
                    workItems: [
                      ...extraction.workItems,
                      {
                        title: "",
                        description: "",
                        areaName: "",
                        actionSummary: "",
                        priority: "normal",
                        itemType: "",
                        itemGroup: "",
                        isAddOn: false,
                        isPi: false,
                        isChecklistItem: false,
                      },
                    ],
                  })
                }
              >
                Add Work Item
              </button>
            </div>

            <div className="todo-list">
              {extraction.workItems.length === 0 ? (
                <p className="helper-text">No work items extracted yet.</p>
              ) : (
                extraction.workItems.map((item, index) => (
                  <div key={`${draft.id}-work-item-${index}`} className="todo-card">
                    <div className="form-grid">
                      <label className="field-block">
                        <span className="field-label">Title</span>
                        <input
                          className="input"
                          value={item.title}
                          onChange={(event) => {
                            const next = [...extraction.workItems];
                            next[index] = { ...item, title: event.target.value };
                            patchExtraction({ workItems: next });
                          }}
                        />
                      </label>

                      <label className="field-block">
                        <span className="field-label">Priority</span>
                        <select
                          className="input input-select"
                          value={item.priority ?? "normal"}
                          onChange={(event) => {
                            const next = [...extraction.workItems];
                            next[index] = {
                              ...item,
                              priority: event.target.value as NonNullable<
                                typeof item.priority
                              >,
                            };
                            patchExtraction({ workItems: next });
                          }}
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </label>

                      <label className="field-block">
                        <span className="field-label">Area Name</span>
                        <input
                          className="input"
                          value={item.areaName ?? ""}
                          onChange={(event) => {
                            const next = [...extraction.workItems];
                            next[index] = { ...item, areaName: event.target.value };
                            patchExtraction({ workItems: next });
                          }}
                        />
                      </label>

                      <label className="field-block">
                        <span className="field-label">Item Type</span>
                        <input
                          className="input"
                          value={item.itemType ?? ""}
                          onChange={(event) => {
                            const next = [...extraction.workItems];
                            next[index] = { ...item, itemType: event.target.value };
                            patchExtraction({ workItems: next });
                          }}
                        />
                      </label>

                      <label className="field-block">
                        <span className="field-label">Item Group</span>
                        <input
                          className="input"
                          value={item.itemGroup ?? ""}
                          onChange={(event) => {
                            const next = [...extraction.workItems];
                            next[index] = { ...item, itemGroup: event.target.value };
                            patchExtraction({ workItems: next });
                          }}
                        />
                      </label>

                      <label className="field-block field-block-wide">
                        <span className="field-label">Action Summary</span>
                        <input
                          className="input"
                          value={item.actionSummary ?? ""}
                          onChange={(event) => {
                            const next = [...extraction.workItems];
                            next[index] = {
                              ...item,
                              actionSummary: event.target.value,
                            };
                            patchExtraction({ workItems: next });
                          }}
                        />
                      </label>

                      <label className="field-block field-block-wide">
                        <span className="field-label">Description</span>
                        <textarea
                          className="composer-textarea"
                          rows={3}
                          value={item.description ?? ""}
                          onChange={(event) => {
                            const next = [...extraction.workItems];
                            next[index] = {
                              ...item,
                              description: event.target.value,
                            };
                            patchExtraction({ workItems: next });
                          }}
                        />
                      </label>
                    </div>

                    <div className="toggle-row">
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={item.isAddOn ?? false}
                          onChange={(event) => {
                            const next = [...extraction.workItems];
                            next[index] = {
                              ...item,
                              isAddOn: event.target.checked,
                            };
                            patchExtraction({ workItems: next });
                          }}
                        />
                        <span>Add On</span>
                      </label>
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={item.isPi ?? false}
                          onChange={(event) => {
                            const next = [...extraction.workItems];
                            next[index] = {
                              ...item,
                              isPi: event.target.checked,
                            };
                            patchExtraction({ workItems: next });
                          }}
                        />
                        <span>PI</span>
                      </label>
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={item.isChecklistItem ?? false}
                          onChange={(event) => {
                            const next = [...extraction.workItems];
                            next[index] = {
                              ...item,
                              isChecklistItem: event.target.checked,
                            };
                            patchExtraction({ workItems: next });
                          }}
                        />
                        <span>Checklist Item</span>
                      </label>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() =>
                          patchExtraction({
                            workItems: extraction.workItems.filter(
                              (_workItem, workItemIndex) => workItemIndex !== index,
                            ),
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="detail-sidebar">
          <section className="panel">
            <div className="detail-sidebar-group">
              <span className="field-label">Draft Status</span>
              <strong>{draft.status}</strong>
            </div>
            <div className="detail-sidebar-group">
              <span className="field-label">Thread</span>
              <span>{draft.thread_id}</span>
            </div>
            <div className="detail-sidebar-group">
              <span className="field-label">Created</span>
              <span>{formatDateTime(draft.created_at)}</span>
            </div>
            <div className="detail-sidebar-group">
              <span className="field-label">Review Notes</span>
              <textarea
                className="composer-textarea"
                rows={6}
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
                placeholder="Add admin notes, missing information, or clarification points..."
              />
            </div>
            <div className="action-stack">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => saveDraft("needs_review")}
                disabled={isSaving || isApproving || isRejecting}
              >
                {isSaving ? "Saving..." : "Save Draft"}
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={approveDraft}
                disabled={isSaving || isApproving || isRejecting}
              >
                {isApproving
                  ? "Approving..."
                  : extraction.shouldCreateProject
                    ? "Approve and Create Project"
                    : "Approve as Lead"}
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => rejectDraft(true)}
                disabled={isSaving || isApproving || isRejecting}
              >
                {isRejecting ? "Updating..." : "Needs More Info"}
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => rejectDraft(false)}
                disabled={isSaving || isApproving || isRejecting}
              >
                {isRejecting ? "Rejecting..." : "Reject Draft"}
              </button>
              {statusMessage ? <p className="helper-text">{statusMessage}</p> : null}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Conversation</p>
                <h2>Source Chat</h2>
              </div>
            </div>
            <div className="message-list">
              {conversation.length === 0 ? (
                <p className="helper-text">No conversation snapshot saved.</p>
              ) : (
                conversation.map((message, index) => (
                  <article
                    key={`${draft.id}-conversation-${index}`}
                    className={`message-bubble ${message.direction === "outbound" ? "is-outbound" : "is-inbound"}`}
                  >
                    <p className="message-meta">
                      {message.senderName ??
                        (message.direction === "outbound"
                          ? "EPS Admin"
                          : "Customer")}
                      {" · "}
                      {formatDateTime(message.sentAt)}
                    </p>
                    <p>{message.text}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
