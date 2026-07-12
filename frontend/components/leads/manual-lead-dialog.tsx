"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

export function ManualLeadDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Could not create the lead.");
      form.reset();
      setOpen(false);
      router.push(`/leads/${payload.lead.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the lead.");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <button className="button button-primary" type="button" onClick={() => setOpen(true)}><Plus size={17}/>New lead</button>
    {open ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setOpen(false); }}>
      <section className="modal-panel manual-lead-modal" role="dialog" aria-modal="true" aria-labelledby="manual-lead-title">
        <div className="panel-header"><div><p className="eyebrow">Manual enquiry</p><h2 id="manual-lead-title">Create a new lead</h2><p className="helper-text">Use this when an enquiry arrives outside WhatsApp. It will enter the same qualification and quote workflow.</p></div><button className="icon-button" type="button" aria-label="Close" onClick={() => setOpen(false)} disabled={saving}><X size={18}/></button></div>
        <form className="form-grid" onSubmit={submit}>
          <label className="field-block"><span className="field-label">Customer name</span><input className="input" name="customerName" autoComplete="name" required/></label>
          <label className="field-block"><span className="field-label">Phone / WhatsApp</span><input className="input" name="phone" type="tel" autoComplete="tel" placeholder="+65 8123 4567"/></label>
          <label className="field-block"><span className="field-label">Email</span><input className="input" name="email" type="email" autoComplete="email"/></label>
          <label className="field-block"><span className="field-label">Lead title</span><input className="input" name="title" placeholder="Optional short title"/></label>
          <label className="field-block field-block-wide"><span className="field-label">What does the customer need?</span><textarea className="input textarea" name="request" rows={5} required placeholder="Describe the work, location details, agreed information, and anything still needed."/></label>
          {error ? <p className="form-error field-block-wide" role="alert">{error}</p> : null}
          <div className="action-row field-block-wide"><button className="button button-secondary" type="button" onClick={() => setOpen(false)} disabled={saving}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? "Creating…" : "Create lead"}</button></div>
        </form>
      </section>
    </div> : null}
  </>;
}
