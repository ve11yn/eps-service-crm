"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/frontend/lib/format";

type SummaryRecord = {
  id: string;
  summary_type: string;
  content: string;
  source_type: string;
  model_name: string | null;
  is_locked: boolean;
  is_current: boolean;
  created_at: string;
  profiles: { display_name: string } | Array<{ display_name: string }> | null;
};

const labels: Record<string, string> = {
  lead: "Lead summary",
  negotiation: "Negotiation summary",
  approved_scope: "Approved / excluded scope",
  decision_needed: "Decision needed",
  worker_update: "Worker update",
  completion: "Completion summary",
};

export function SecondBrainPanel({ entityType, entityId, summaries, expectedTypes }: { entityType: "lead" | "quote" | "project"; entityId: string; summaries: SummaryRecord[]; expectedTypes: string[] }) {
  const router = useRouter();
  const [editingType, setEditingType] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [lockCorrection, setLockCorrection] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const grouped = useMemo(() => new Map(expectedTypes.map((type) => [type, summaries.filter((record) => record.summary_type === type)])), [summaries, expectedTypes]);

  async function perform(payload: Record<string, unknown>) {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/second-brain/${entityType}/${entityId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error ?? "Unable to update the summary.");
      setEditingType(null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update the summary.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel second-brain-panel">
      <div className="panel-header"><div><h2>Latest overview</h2></div><button type="button" className="button button-secondary" disabled={pending} onClick={() => perform({ action: "refresh" })}>{pending ? "Refreshing…" : "Refresh overview"}</button></div>
      <p className="helper-text">A quick view of the latest scope, decisions and items needing attention. Confirmed details can be edited and protected from later updates.</p>
      <div className="second-brain-grid">
        {expectedTypes.map((type) => {
          const history = grouped.get(type) ?? [];
          const current = history.find((record) => record.is_current);
          return <article key={type} className="second-brain-card">
            <div className="second-brain-card-head"><strong>{labels[type] ?? type}</strong>{current ? <span className={`status-badge ${current.source_type === "human" ? "status-approved" : "status-needs-review"}`}>{current.source_type === "human" ? "Human confirmed" : current.source_type === "ai" ? "AI generated" : "System generated"}</span> : null}</div>
            <p>{current?.content ?? "No overview is available yet. Select Refresh overview to prepare one from the latest record details."}</p>
            {current ? <div className="inline-actions"><button type="button" className="button button-secondary" onClick={() => { setEditingType(type); setContent(current.content); setLockCorrection(current.is_locked); }}>Correct</button><button type="button" className="button button-secondary" disabled={pending} onClick={() => perform({ action: "lock", summaryType: type, isLocked: !current.is_locked })}>{current.is_locked ? "Unlock" : "Lock"}</button></div> : null}
            {editingType === type ? <div className="second-brain-editor"><label className="field-block"><span className="field-label">Human-confirmed summary</span><textarea className="textarea" rows={4} value={content} onChange={(event) => setContent(event.target.value)} /></label><label className="checkbox-row"><input type="checkbox" checked={lockCorrection} onChange={(event) => setLockCorrection(event.target.checked)} /><span>Lock this correction against automatic updates</span></label><div className="inline-actions"><button type="button" className="button button-secondary" onClick={() => setEditingType(null)}>Cancel</button><button type="button" className="button button-primary" disabled={pending || !content.trim()} onClick={() => perform({ action: "correct", summaryType: type, content, isLocked: lockCorrection })}>Save correction</button></div></div> : null}
            {history.length ? <details className="management-details"><summary>History ({history.length})</summary><div className="activity-list compact-activity-list">{history.map((record) => { const profile = Array.isArray(record.profiles) ? record.profiles[0] : record.profiles; return <div key={record.id} className="activity-item"><div><strong>{record.source_type === "human" ? `Human correction${profile?.display_name ? ` by ${profile.display_name}` : ""}` : record.source_type === "ai" ? "AI update" : "System update"}</strong><p>{record.content}</p></div><span className="helper-text">{formatDateTime(record.created_at)}</span></div>; })}</div></details> : null}
          </article>;
        })}
      </div>
      {message ? <p className="notice notice-error">{message}</p> : null}
    </section>
  );
}
