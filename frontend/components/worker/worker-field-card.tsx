"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  Clock3,
  History,
  MapPin,
  Navigation,
  UploadCloud,
} from "lucide-react";
import type { WorkerWorkspaceItem } from "@/backend/services/projects/get-worker-workspace";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";
import { formatDateTime } from "@/frontend/lib/format";

const progressSteps = [
  { key: "on_the_way", label: "On the way", shortLabel: "Travelling" },
  { key: "arrived", label: "I’ve arrived", shortLabel: "Arrived" },
  { key: "in_progress", label: "Start work", shortLabel: "Working" },
  { key: "completed", label: "Complete job", shortLabel: "Complete" },
] as const;

type ProgressUpdate = (typeof progressSteps)[number]["key"];

export function WorkerFieldCard({
  item,
  sequence,
  defaultExpanded = false,
}: {
  item: WorkerWorkspaceItem;
  sequence?: number;
  defaultExpanded?: boolean;
}) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [issueType, setIssueType] = useState("customer_not_home");
  const [issueNotes, setIssueNotes] = useState("");
  const [evidenceType, setEvidenceType] = useState("before");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progressNote, setProgressNote] = useState("");

  async function sendUpdate(updateType: ProgressUpdate) {
    setIsPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/worker/items/${item.id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updateType, notes: progressNote.trim() }),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Update failed.");
      setProgressNote("");
      setMessage(`${progressSteps.find((step) => step.key === updateType)?.label} recorded.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setIsPending(false);
    }
  }

  async function reportIssue() {
    setIsPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/worker/items/${item.id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updateType: "issue", issueType, notes: issueNotes }),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Issue report failed.");
      setIssueNotes("");
      setMessage("Your coordinator has been alerted.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Issue report failed.");
    } finally {
      setIsPending(false);
    }
  }

  async function uploadEvidence() {
    if (!file) {
      setMessage("Choose a photo first.");
      return;
    }
    setIsPending(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("evidenceType", evidenceType);
      form.set("caption", caption);
      const response = await fetch(`/api/worker/items/${item.id}/evidence`, { method: "POST", body: form });
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Upload failed.");
      setFile(null);
      setCaption("");
      setMessage("Photo uploaded successfully.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsPending(false);
    }
  }

  const hasBefore = item.evidence.some((asset) => asset.evidenceType === "before");
  const hasAfter = item.evidence.some((asset) => asset.evidenceType === "after");
  const latestProgress = item.recentUpdates.find((update) =>
    progressSteps.some((step) => step.key === update.updateType),
  )?.updateType;
  const currentProgressIndex = item.statusCode === "completed"
    ? progressSteps.length - 1
    : progressSteps.findIndex((step) => step.key === latestProgress);
  const nextStep = item.statusCode === "completed"
    ? null
    : progressSteps[Math.min(currentProgressIndex + 1, progressSteps.length - 1)];
  const scheduledAt = item.scheduledStartAt;
  const address = item.project?.address;
  const progressPlaceholders: Record<ProgressUpdate, string> = {
    on_the_way: "Add your ETA or travel update",
    arrived: "Confirm access and what you found on arrival",
    in_progress: "State what work you are starting",
    completed: "Summarise what was completed",
  };
  const evidenceBlockMessage = nextStep?.key === "in_progress" && item.beforeAfterRequired && !hasBefore
    ? "Upload a before photo before starting work."
    : nextStep?.key === "completed" && item.beforeAfterRequired && !hasAfter
      ? "Upload an after photo before completing this task."
      : null;
  const progressBlocked = Boolean(evidenceBlockMessage);
  const projectLabel = item.project?.projectCode ?? "Assigned task";
  const normalizedPriority = item.priorityCode.toLowerCase().replaceAll("_", " ");
  const priorityKey = (["low", "normal", "high", "urgent"] as const).find((value) => normalizedPriority.includes(value)) ?? "normal";
  const priorityLabel = `${priorityKey} priority`;
  const detailsId = `worker-task-details-${item.id}`;

  return (
    <article className={`worker-job-card priority-${priorityKey} ${isExpanded ? "is-expanded" : "is-collapsed"}`}>
      <header className="worker-job-header">
        <button
          type="button"
          className="worker-job-header-toggle"
          aria-expanded={isExpanded}
          aria-controls={isExpanded ? detailsId : undefined}
          onClick={() => setIsExpanded((current) => !current)}
        >
          <div className="worker-job-title-wrap">
            <div className="worker-job-order">{sequence ?? "•"}</div>
            <div>
              <p className="worker-project-code" title={item.project?.title ?? undefined}>{projectLabel}</p>
              <h3>{item.title}</h3>
              <div className="worker-task-meta" aria-label="Task details">
                <span>{item.areaName ?? "General area"}</span>
                <span className="worker-task-meta-divider" aria-hidden="true">•</span>
                <span className={`worker-task-priority is-${priorityKey}`} data-priority={priorityKey}>{priorityLabel}</span>
              </div>
            </div>
          </div>
          <div className="worker-job-header-actions">
            <StatusBadge status={item.statusCode} />
            <span className="worker-task-chevron" aria-hidden="true"><ChevronDown size={18} /></span>
          </div>
        </button>
      </header>

      <div className="worker-job-context">
        <div><Clock3 size={17} aria-hidden="true" /><span><small>Scheduled</small><strong>{formatDateTime(scheduledAt)}</strong></span></div>
        <div><MapPin size={17} aria-hidden="true" /><span><small>Location</small><strong>{address ?? "Address not recorded"}</strong></span></div>
        <div><ArrowRight size={17} aria-hidden="true" /><span><small>Next action</small><strong>{nextStep?.label ?? "Coordinator review"}</strong></span></div>
        {address ? (
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">
            Directions <Navigation size={15} aria-hidden="true" />
          </a>
        ) : null}
      </div>

      {isExpanded ? (
      <div id={detailsId} className="worker-job-details">
      <div className="worker-progress" aria-label="Job progress">
        {progressSteps.map((step, index) => {
          const isDone = index <= currentProgressIndex;
          const isCurrent = index === currentProgressIndex + 1 && item.statusCode !== "completed";
          return (
            <div className={`${isDone ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`} key={step.key}>
              <span>{isDone ? <Check size={13} /> : index + 1}</span>
              <small>{step.shortLabel}</small>
            </div>
          );
        })}
      </div>

      {item.beforeAfterRequired ? (
        <div className="worker-evidence-checklist">
          <div><Camera size={17} /><strong>Photo checklist</strong></div>
          <span className={hasBefore ? "is-complete" : ""}>{hasBefore ? <Check size={13} /> : null} Before</span>
          <span className={hasAfter ? "is-complete" : ""}>{hasAfter ? <Check size={13} /> : null} After</span>
        </div>
      ) : null}

      <div className="worker-task-action-grid">
        <div className="worker-primary-action">
          {nextStep ? (
            <div className="worker-progress-update">
              <header className="worker-action-card-header worker-progress-update-header">
                <div>
                  <span className="worker-action-heading-icon"><Navigation size={20} aria-hidden="true" /></span>
                  <span>
                    <strong>{nextStep.label}</strong>
                    <small>Add a site note before confirming this update.</small>
                  </span>
                </div>
                <span className="worker-action-card-badge">Next update</span>
              </header>
              <div className="worker-progress-update-body">
                <label className="worker-form-field">
                  <span className="worker-field-label-row"><span>Site update</span><small>Required</small></span>
                  <textarea
                    className="input"
                    rows={2}
                    maxLength={500}
                    value={progressNote}
                    onChange={(event) => setProgressNote(event.target.value)}
                    placeholder={progressPlaceholders[nextStep.key]}
                  />
                </label>
                {evidenceBlockMessage ? <p className="worker-action-requirement"><Camera size={15} />{evidenceBlockMessage}</p> : null}
                <button
                  type="button"
                  className="button button-primary worker-next-button"
                  disabled={isPending || progressNote.trim().length < 3 || progressBlocked}
                  onClick={() => sendUpdate(nextStep.key)}
                >
                  <span>{isPending ? "Saving update…" : `Confirm ${nextStep.label.toLowerCase()}`}</span>
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <div className="worker-complete-message"><Check size={18} /><span><strong>Work complete</strong><small>Sent to the coordinator for review.</small></span></div>
          )}
        </div>

        <section className="worker-photo-card" aria-labelledby={`photo-heading-${item.id}`}>
          <header className="worker-action-card-header worker-photo-card-header">
            <div><span className="worker-action-heading-icon"><UploadCloud size={20} aria-hidden="true" /></span><span><strong id={`photo-heading-${item.id}`}>Add site photos</strong><small>Choose the type, add a note, then select a photo.</small></span></div>
            <span className="worker-action-card-badge">{item.evidence.length} {item.evidence.length === 1 ? "photo" : "photos"}</span>
          </header>
          <div className="worker-photo-card-body">
            <div className="worker-photo-fields">
              <label className="worker-form-field"><span>Photo type</span><select className="input input-select" value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)}>
                <option value="before">Before work</option><option value="during">During work</option><option value="after">After work</option>
                <option value="defect">Defect</option><option value="materials">Materials</option><option value="access">Access</option>
                <option value="marked_up">Marked-up clarification</option>
              </select></label>
              <label className="worker-form-field"><span>Photo note <small>Optional</small></span><input className="input" value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="What does it show?" /></label>
            </div>

            <input id={`worker-photo-${item.id}`} className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            <div className="worker-photo-upload-row">
              <label className={`worker-file-picker ${file ? "has-file" : ""}`} htmlFor={`worker-photo-${item.id}`}>
                <span className="worker-file-picker-icon"><UploadCloud size={21} aria-hidden="true" /></span>
                <span className="worker-file-picker-copy"><strong>{file ? file.name : "Choose a site photo"}</strong><small>{file ? "Select a different photo" : "Camera or device"}</small></span>
                <span className="worker-file-picker-action">{file ? "Change" : "Choose"}</span>
              </label>

              <button type="button" className="button button-primary worker-photo-upload-button" disabled={isPending || !file} onClick={uploadEvidence}>Upload photo</button>
            </div>

            {item.evidence.length > 0 ? (
              <details className="worker-photo-gallery">
                <summary>View {item.evidence.length} uploaded {item.evidence.length === 1 ? "photo" : "photos"}<ChevronDown size={16} aria-hidden="true" /></summary>
                <div className="worker-evidence-grid">
                  {item.evidence.map((asset) => (
                    <a key={asset.id} href={asset.signedUrl ?? "#"} target="_blank" rel="noreferrer">
                      {asset.signedUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={asset.signedUrl} alt={asset.caption ?? asset.evidenceType ?? "Evidence"} loading="lazy" decoding="async" />
                      ) : <span className="worker-photo-placeholder"><Camera size={20} /></span>}
                      <span>{asset.evidenceType?.replaceAll("_", " ") ?? "photo"}</span>
                    </a>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        </section>
      </div>

      <div className="worker-tools">

        <details className="worker-tool worker-issue-tool">
          <summary><span><AlertTriangle size={18} /> Need help? <small>Alert the coordinator</small></span><ChevronDown size={18} /></summary>
          <div className="worker-tool-body">
            <div className="worker-tool-intro is-warning">
              <span className="worker-tool-intro-icon"><AlertTriangle size={19} /></span>
              <div><strong>Request a decision from the coordinator</strong><p>Explain the blocker clearly. This creates an attention item for the office team.</p></div>
            </div>
            <div className="worker-tool-form">
              <label className="worker-form-field"><span>Issue type</span><select className="input input-select" value={issueType} onChange={(event) => setIssueType(event.target.value)}>
                <option value="customer_not_home">Customer not home</option><option value="need_parts">Parts required</option>
                <option value="safety_concern">Safety concern</option><option value="scope_question">Scope question</option><option value="other">Other</option>
              </select></label>
              <label className="worker-form-field"><span>What happened and what do you need?</span><textarea className="input" rows={4} maxLength={1000} value={issueNotes} onChange={(event) => setIssueNotes(event.target.value)} placeholder="Example: The existing fitting is damaged. I need approval to replace it before continuing." /></label>
              <div className="worker-tool-actions"><span>The coordinator will see this as needing attention.</span><button type="button" className="button worker-alert-button" disabled={isPending || issueNotes.trim().length < 5} onClick={reportIssue}>Send alert</button></div>
            </div>
          </div>
        </details>

        {item.recentUpdates.length > 0 ? (
          <details className="worker-tool">
            <summary><span><History size={18} /> Activity <small>{item.recentUpdates.length} recent updates</small></span><ChevronDown size={18} /></summary>
            <div className="worker-update-history">
              {item.recentUpdates.map((update) => (
                <div key={update.id}><strong>{update.updateType.replaceAll("_", " ")}</strong><span>{update.notes ?? formatDateTime(update.createdAt)}</span></div>
              ))}
            </div>
          </details>
        ) : null}
      </div>

      </div>
      ) : null}

      {message ? <div className="worker-feedback" role="status">{message}</div> : null}
    </article>
  );
}
