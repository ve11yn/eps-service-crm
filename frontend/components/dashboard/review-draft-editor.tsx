"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime, formatSourceChannelLabel } from "@/frontend/lib/format";
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

function getWorkItemGuidance(item: AiLeadExtraction["workItems"][number]) {
  const haystack = [
    item.title,
    item.description,
    item.areaName,
    item.itemType,
    item.itemGroup,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  if (haystack.includes("plumb") || haystack.includes("leak") || haystack.includes("pipe")) {
    return {
      photoHint:
        "Ask for one wide photo and one close-up so the leak can be tied to the right part of the job.",
      followUpHint: "Confirm whether the leak is active, whether water can be shut off, and whether access is safe.",
    };
  }

  if (haystack.includes("clean")) {
    return {
      photoHint:
        "Ask for before photos of the main space and any stained or high-traffic areas.",
      followUpHint: "Confirm scope, access, and whether any delicate surfaces need special handling.",
    };
  }

  if (haystack.includes("electr") || haystack.includes("power") || haystack.includes("light")) {
    return {
      photoHint:
        "Ask for a wide shot and a close-up of the affected switch, outlet, or fitting.",
      followUpHint: "Confirm whether power is currently off, whether the issue is intermittent, and whether parts are already on site.",
    };
  }

  if (haystack.includes("paint") || haystack.includes("wall") || haystack.includes("patch")) {
    return {
      photoHint:
        "Ask for one wide photo and one close-up so the damaged surface is easy to identify.",
      followUpHint: "Confirm the full area size, color match requirements, and any hidden defects behind the visible damage.",
    };
  }

  return {
    photoHint:
      "Ask for one wide photo and one close-up photo so the work item can be tied to the correct part of the job.",
    followUpHint: "Confirm access, urgency, and any missing measurements before approval.",
  };
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
  const [uploadingWorkItemIndex, setUploadingWorkItemIndex] = useState<number | null>(null);
  const [expandedWorkItemIndex, setExpandedWorkItemIndex] = useState<number | null>(() =>
    extraction.workItems.length > 0 ? 0 : null,
  );

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

  async function uploadWorkItemImage(index: number, file: File) {
    setUploadingWorkItemIndex(index);
    setStatusMessage(null);

    try {
      const formData = new FormData();
      formData.set("itemIndex", String(index));
      formData.set("file", file);

      const response = await fetch(`/api/review-drafts/${draft.id}/work-item-media`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        mediaAsset?: NonNullable<AiLeadExtraction["workItems"][number]["mediaAssets"]>[number];
      };

      if (!response.ok || !payload.success || !payload.mediaAsset) {
        throw new Error(payload.error ?? "Failed to upload work item image.");
      }

      const next = [...extraction.workItems];
      const workItem = next[index];

      if (workItem) {
        next[index] = {
          ...workItem,
          mediaAssets: [...(workItem.mediaAssets ?? []), payload.mediaAsset],
        };
        patchExtraction({ workItems: next });
      }

      setStatusMessage("Image uploaded and linked to this draft work item.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to upload work item image.",
      );
    } finally {
      setUploadingWorkItemIndex(null);
    }
  }

  function addWorkItem() {
    const nextIndex = extraction.workItems.length;

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
    });
    setExpandedWorkItemIndex(nextIndex);
  }

  function removeWorkItem(index: number) {
    patchExtraction({
      workItems: extraction.workItems.filter(
        (_workItem, workItemIndex) => workItemIndex !== index,
      ),
    });
    setExpandedWorkItemIndex((current) => {
      if (current === null) return null;
      if (current === index) return null;
      if (current > index) return current - 1;
      return current;
    });
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Review Draft</p>
          <h1>Review Intake</h1>
        </div>

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

          </section>

          <section className="panel work-item-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Project Work Items</p>
                <h2>Create Work Items</h2>
                <p className="report-panel-copy">
                  Keep each item short and focused. Expand a row to add the task,
                  priority, and photo guidance.
                </p>
              </div>
              <button
                type="button"
                className="button button-secondary"
                onClick={addWorkItem}
              >
                Add Work Item
              </button>
            </div>

            <div className="todo-list">
              {extraction.workItems.length === 0 ? (
                <p className="helper-text">No work items extracted yet.</p>
              ) : (
                extraction.workItems.map((item, index) => {
                  const isExpanded = expandedWorkItemIndex === index;
                  const summary =
                    item.areaName || item.itemType || item.itemGroup || item.priority || "No details yet";
                  const guidance = getWorkItemGuidance(item);
                  const modeLabel = item.isChecklistItem
                    ? "Checklist"
                    : item.isPi
                      ? "PI"
                      : item.isAddOn
                        ? "Add-on"
                        : "Core";

                  return (
                    <div
                      key={`${draft.id}-work-item-${index}`}
                      className={`work-item-editor ${isExpanded ? "is-expanded" : ""}`}
                    >
                      <div className="work-item-editor-index">{index + 1}</div>
                      <button
                        type="button"
                        className="work-item-editor-header"
                        aria-expanded={isExpanded}
                        onClick={() =>
                          setExpandedWorkItemIndex(isExpanded ? null : index)
                        }
                      >
                        <div className="work-item-summary-row">
                          <span className="work-item-editor-title">
                            {item.title || `Work Item ${index + 1}`}
                          </span>
                          <span className="work-item-tag">{modeLabel}</span>
                        </div>
                        <span className="work-item-editor-summary">{summary}</span>
                      </button>

                      {isExpanded ? (
                        <>
                          <div className="work-item-guidance">
                            <div className="work-item-guidance-title">
                              <span className="field-label">Photo Intake</span>
                              <span className="work-item-tag is-soft">Guidance</span>
                            </div>
                            <p>{guidance.photoHint}</p>
                            <p>{guidance.followUpHint}</p>
                          </div>

                          <div className="work-item-fields">
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
                          </div>

                          <div className="work-item-fields work-item-fields-wide">
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

                          <div className="toggle-row work-item-toggle-row">
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
                          </div>

                          <div className="work-item-media">
                            <div>
                              <span className="field-label">Images</span>
                              <p className="helper-text">
                                Images upload first, then stay linked to this task when the
                                project is created.
                              </p>
                            </div>
                            <label
                              className={`button button-secondary work-item-upload-button ${uploadingWorkItemIndex === index ? "is-loading" : ""}`}
                              aria-busy={uploadingWorkItemIndex === index}
                            >
                              {uploadingWorkItemIndex === index ? (
                                <>
                                  <span aria-hidden="true" className="upload-spinner" />
                                  <span className="sr-only">Uploading image</span>
                                </>
                              ) : (
                                <>
                                  <Image
                                    src="/upload-cloud.svg"
                                    alt=""
                                    width={26}
                                    height={26}
                                    className="upload-icon"
                                  />
                                  <span className="sr-only">Upload image</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                disabled={uploadingWorkItemIndex !== null}
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  event.target.value = "";
                                  if (!file) return;
                                  void uploadWorkItemImage(index, file);
                                }}
                              />
                            </label>

                            {uploadingWorkItemIndex === index ? (
                              <div className="work-item-media-loading">
                                <span className="upload-spinner" aria-hidden="true" />
                                <span>Uploading image...</span>
                              </div>
                            ) : null}

                            {(item.mediaAssets && item.mediaAssets.length > 0) ||
                            uploadingWorkItemIndex === index ? (
                              <div className="work-item-media-list">
                                {uploadingWorkItemIndex === index ? (
                                  <div className="work-item-media-chip is-loading">
                                    <div className="work-item-media-skeleton" />
                                    <span>Uploading...</span>
                                  </div>
                                ) : null}
                                {(item.mediaAssets ?? []).map((mediaAsset) => (
                                  <div key={mediaAsset.id} className="work-item-media-chip">
                                    {mediaAsset.signedUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={mediaAsset.signedUrl}
                                        alt={mediaAsset.caption ?? "Work item image"}
                                      />
                                    ) : null}
                                    <span>
                                      {mediaAsset.fileName ?? mediaAsset.caption ?? "Uploaded image"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="helper-text">
                                No images uploaded for this work item yet.
                              </p>
                            )}
                          </div>

                          <div className="work-item-footer">
                            <button
                              type="button"
                              className="button button-secondary"
                              onClick={() => removeWorkItem(index)}
                            >
                              Remove
                            </button>
                          </div>
                        </>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <aside className="detail-sidebar">
          <section className="panel approval-panel">
            <div className="detail-sidebar-group">
              <span className="field-label">Draft Status</span>
              <strong className="approval-status">{draft.status}</strong>
            </div>

            <div className="approval-decision">
              <p className="field-label">Approval Outcome</p>
              <label className={`approval-option ${extraction.shouldCreateProject ? "is-selected" : ""}`}>
                <input
                  type="checkbox"
                  checked={extraction.shouldCreateProject}
                  onChange={(event) =>
                    patchExtraction({
                      shouldCreateProject: event.target.checked,
                    })
                  }
                />
                <span>
                  <strong>Create project on approval</strong>
                  <small>
                    Approval will create a lead, project, and the work items below.
                  </small>
                </span>
              </label>
              <label className={`approval-option ${extraction.siteVisitRequired ? "is-selected" : ""}`}>
                <input
                  type="checkbox"
                  checked={extraction.siteVisitRequired}
                  onChange={(event) =>
                    patchExtraction({ siteVisitRequired: event.target.checked })
                  }
                />
                <span>
                  <strong>Site visit required</strong>
                  <small>
                    Mark this when Gage needs an inspection before or during project planning.
                  </small>
                </span>
              </label>
            </div>

            <div className="approval-summary">
              <span className="field-label">What happens next</span>
              <p>
                {extraction.shouldCreateProject
                  ? "Clicking Approve will create a project and attach the listed work items."
                  : "Clicking Approve will save this as a lead only. No project will be created."}
              </p>
            </div>
            <div className="detail-sidebar-group">
              <span className="field-label">Source Channel</span>
              <span>{formatSourceChannelLabel(draft.source_channel_code)}</span>
            </div>
            <div className="detail-sidebar-group">
              <span className="field-label">Linked Lead</span>
              <span>{draft.lead_id ? "Linked" : "Not linked yet"}</span>
            </div>
            <div className="detail-sidebar-group">
              <span className="field-label">Linked Project</span>
              <span>{draft.approved_project_id ? "Created" : "Not created yet"}</span>
            </div>
            <div className="detail-sidebar-group">
              <span className="field-label">Created</span>
              <span>{formatDateTime(draft.created_at)}</span>
            </div>
            <div className="detail-sidebar-group">
              <span className="field-label">Updated</span>
              <span>{formatDateTime(draft.updated_at)}</span>
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
              <p className="helper-text">
                {extraction.shouldCreateProject
                  ? "This will convert the draft into a lead and project."
                  : "This will convert the draft into a lead only."}
              </p>
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
                          ? "Gage Admin"
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
