"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkerWorkspaceItem } from "@/backend/services/projects/get-worker-workspace";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";
import { formatDateTime } from "@/frontend/lib/format";

const actionLabels = {
  on_the_way: "On the way",
  arrived: "Arrived",
  in_progress: "Start work",
  completed: "Complete item",
} as const;

export function WorkerFieldCard({ item }: { item: WorkerWorkspaceItem }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [issueType, setIssueType] = useState("customer_not_home");
  const [issueNotes, setIssueNotes] = useState("");
  const [evidenceType, setEvidenceType] = useState("before");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function sendUpdate(updateType: keyof typeof actionLabels) {
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
      setMessage(`${actionLabels[updateType]} recorded.`);
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
      setMessage("Admin has been alerted.");
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
      setMessage("Photo uploaded.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsPending(false);
    }
  }

  const hasBefore = item.evidence.some((asset) => asset.evidenceType === "before");
  const hasAfter = item.evidence.some((asset) => asset.evidenceType === "after");

  return (
    <article className="worker-job-card">
      <header className="worker-job-header">
        <div>
          <p className="eyebrow">{item.project?.projectCode ?? "Job"}</p>
          <h2>{item.title}</h2>
          <p>{item.description ?? item.actionSummary ?? item.areaName ?? "Assigned work item"}</p>
        </div>
        <StatusBadge status={item.statusCode} />
      </header>

      <div className="worker-job-meta">
        <span>{item.project?.title ?? "Project"}</span>
        <span>{item.project?.address ?? "Address not recorded"}</span>
        <span>{formatDateTime(item.project?.scheduledStartAt)}</span>
      </div>

      {item.beforeAfterRequired ? (
        <div className="worker-evidence-requirement">
          <strong>Required evidence</strong>
          <span className={hasBefore ? "is-complete" : ""}>Before {hasBefore ? "uploaded" : "required"}</span>
          <span className={hasAfter ? "is-complete" : ""}>After {hasAfter ? "uploaded" : "required"}</span>
        </div>
      ) : null}

      <section className="worker-action-section">
        <h3>Job progress</h3>
        <div className="worker-progress-actions">
          {(Object.keys(actionLabels) as Array<keyof typeof actionLabels>).map((action) => (
            <button
              key={action}
              type="button"
              className={action === "completed" ? "button button-primary" : "button button-secondary"}
              disabled={isPending || item.statusCode === "completed"}
              onClick={() => sendUpdate(action)}
            >
              {actionLabels[action]}
            </button>
          ))}
        </div>
      </section>

      <section className="worker-action-section">
        <h3>Upload evidence</h3>
        <div className="worker-upload-grid">
          <select className="input input-select" value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)}>
            <option value="before">Before</option>
            <option value="during">During</option>
            <option value="after">After</option>
            <option value="defect">Defect</option>
            <option value="materials">Materials</option>
            <option value="access">Access</option>
            <option value="marked_up">Marked-up clarification</option>
          </select>
          <input className="input" type="file" accept="image/*" capture="environment" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <input className="input" value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Optional photo note" />
          <button type="button" className="button button-primary" disabled={isPending || !file} onClick={uploadEvidence}>Upload photo</button>
        </div>
        {item.evidence.length > 0 ? (
          <div className="worker-evidence-grid">
            {item.evidence.map((asset) => (
              <a key={asset.id} href={asset.signedUrl ?? "#"} target="_blank" rel="noreferrer">
                {asset.signedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.signedUrl} alt={asset.caption ?? asset.evidenceType ?? "Evidence"} />
                ) : null}
                <span>{asset.evidenceType?.replaceAll("_", " ") ?? "photo"}</span>
              </a>
            ))}
          </div>
        ) : null}
      </section>

      <section className="worker-action-section worker-issue-section">
        <h3>Report an issue</h3>
        <div className="worker-issue-grid">
          <select className="input input-select" value={issueType} onChange={(event) => setIssueType(event.target.value)}>
            <option value="customer_not_home">Customer not home</option>
            <option value="need_parts">Parts required</option>
            <option value="safety_concern">Safety concern</option>
            <option value="scope_question">Scope question</option>
            <option value="other">Other</option>
          </select>
          <textarea className="input" rows={2} value={issueNotes} onChange={(event) => setIssueNotes(event.target.value)} placeholder="Describe what happened and what admin needs to decide" />
          <button type="button" className="button button-secondary" disabled={isPending || !issueNotes.trim()} onClick={reportIssue}>Alert admin</button>
        </div>
      </section>

      {item.recentUpdates.length > 0 ? (
        <details className="worker-update-history">
          <summary>Recent updates ({item.recentUpdates.length})</summary>
          {item.recentUpdates.map((update) => (
            <div key={update.id}>
              <strong>{update.updateType.replaceAll("_", " ")}</strong>
              <span>{update.notes ?? formatDateTime(update.createdAt)}</span>
            </div>
          ))}
        </details>
      ) : null}
      {message ? <p className="helper-text worker-feedback">{message}</p> : null}
    </article>
  );
}
