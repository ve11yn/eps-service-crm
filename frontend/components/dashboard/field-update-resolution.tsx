"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FieldUpdateResolution({ projectId, updateId }: { projectId: string; updateId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function resolve() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/field-updates/${updateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolutionNotes: notes || null }),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Resolution failed.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Resolution failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="field-update-resolution">
      <input className="input" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Resolution note" />
      <button type="button" className="button button-primary" disabled={saving} onClick={resolve}>{saving ? "Saving..." : "Resolve alert"}</button>
      {message ? <span className="helper-text">{message}</span> : null}
    </div>
  );
}
