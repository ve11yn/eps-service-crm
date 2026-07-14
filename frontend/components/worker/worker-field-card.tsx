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

export function WorkerFieldCard({ item, sequence }: { item: WorkerWorkspaceItem; sequence?: number }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [issueType, setIssueType] = useState("customer_not_home");
  const [issueNotes, setIssueNotes] = useState("");
  const [evidenceType, setEvidenceType] = useState("before");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function sendUpdate(updateType: ProgressUpdate) {
    setIsPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/worker/items/${item.id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updateType }),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Update failed.");
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
  const evidenceComplete = !item.beforeAfterRequired || (hasBefore && hasAfter);
  const latestProgress = item.recentUpdates.find((update) =>
    progressSteps.some((step) => step.key === update.updateType),
  )?.updateType;
  const currentProgressIndex = item.statusCode === "completed"
    ? progressSteps.length - 1
    : progressSteps.findIndex((step) => step.key === latestProgress);
  const nextStep = item.statusCode === "completed"
    ? null
    : progressSteps[Math.min(currentProgressIndex + 1, progressSteps.length - 1)];
  const scheduledAt = item.scheduledStartAt ?? item.project?.scheduledStartAt;
  const address = item.project?.address;

  return (
    <article className={`worker-job-card priority-${item.priorityCode}`}>
      <header className="worker-job-header">
        <div className="worker-job-title-wrap">
          <div className="worker-job-order">{sequence ?? "•"}</div>
          <div>
            <p className="worker-project-code">{item.project?.projectCode ?? "Assigned job"}</p>
            <h3>{item.title}</h3>
            <p>{item.description ?? item.actionSummary ?? item.areaName ?? "Assigned work item"}</p>
          </div>
        </div>
        <StatusBadge status={item.statusCode} />
      </header>

      <div className="worker-job-context">
        <div><Clock3 size={17} aria-hidden="true" /><span><small>Scheduled</small><strong>{formatDateTime(scheduledAt)}</strong></span></div>
        <div><MapPin size={17} aria-hidden="true" /><span><small>Location</small><strong>{address ?? "Address not recorded"}</strong></span></div>
        {address ? (
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">
            Directions <Navigation size={15} aria-hidden="true" />
          </a>
        ) : null}
      </div>

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

      <div className="worker-primary-action">
        {nextStep ? (
          <button
            type="button"
            className="worker-next-button"
            disabled={isPending || (nextStep.key === "completed" && !evidenceComplete)}
            onClick={() => sendUpdate(nextStep.key)}
          >
            <span>{isPending ? "Saving update…" : nextStep.label}</span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        ) : (
          <div className="worker-complete-message"><Check size={18} /><span><strong>Work complete</strong><small>Sent to the coordinator for review.</small></span></div>
        )}
        {nextStep?.key === "completed" && !evidenceComplete ? (
          <p>Upload the required before and after photos to complete this job.</p>
        ) : null}
      </div>

      <div className="worker-tools">
        <details className="worker-tool" open={item.beforeAfterRequired && !evidenceComplete}>
          <summary><span><Camera size={18} /> Add site photos <small>{item.evidence.length} uploaded</small></span><ChevronDown size={18} /></summary>
          <div className="worker-tool-body">
            <div className="worker-upload-grid">
              <label><span>Photo type</span><select className="input input-select" value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)}>
                <option value="before">Before</option><option value="during">During</option><option value="after">After</option>
                <option value="defect">Defect</option><option value="materials">Materials</option><option value="access">Access</option>
                <option value="marked_up">Marked-up clarification</option>
              </select></label>
              <label><span>Choose photo</span><input className="input worker-file-input" type="file" accept="image/*" capture="environment" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
              <label className="worker-caption-field"><span>Note (optional)</span><input className="input" value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="What should the coordinator notice?" /></label>
              <button type="button" className="button button-primary" disabled={isPending || !file} onClick={uploadEvidence}>Upload photo</button>
            </div>
            {item.evidence.length > 0 ? (
              <div className="worker-evidence-grid">
                {item.evidence.map((asset) => (
                  <a key={asset.id} href={asset.signedUrl ?? "#"} target="_blank" rel="noreferrer">
                    {asset.signedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.signedUrl} alt={asset.caption ?? asset.evidenceType ?? "Evidence"} />
                    ) : <span className="worker-photo-placeholder"><Camera size={20} /></span>}
                    <span>{asset.evidenceType?.replaceAll("_", " ") ?? "photo"}</span>
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </details>

        <details className="worker-tool worker-issue-tool">
          <summary><span><AlertTriangle size={18} /> Need help? <small>Alert the coordinator</small></span><ChevronDown size={18} /></summary>
          <div className="worker-tool-body worker-issue-grid">
            <label><span>What happened?</span><select className="input input-select" value={issueType} onChange={(event) => setIssueType(event.target.value)}>
              <option value="customer_not_home">Customer not home</option><option value="need_parts">Parts required</option>
              <option value="safety_concern">Safety concern</option><option value="scope_question">Scope question</option><option value="other">Other</option>
            </select></label>
            <label><span>What do you need?</span><textarea className="input" rows={3} value={issueNotes} onChange={(event) => setIssueNotes(event.target.value)} placeholder="Tell the coordinator what happened and what decision you need" /></label>
            <button type="button" className="button worker-alert-button" disabled={isPending || !issueNotes.trim()} onClick={reportIssue}>Send alert</button>
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

      {message ? <div className="worker-feedback" role="status">{message}</div> : null}
    </article>
  );
}
