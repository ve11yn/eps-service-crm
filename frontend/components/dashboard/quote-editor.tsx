"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DecisionStatus = "proposed" | "approved" | "rejected" | "deferred";

type EditableQuoteItem = {
  clientKey: string;
  id: string | null;
  pricingItemId: string | null;
  title: string;
  description: string;
  quantity: number;
  unitLabel: string;
  unitPrice: number;
  notes: string;
  decisionStatus: DecisionStatus;
  decisionNotes: string;
  catalogLabel: string | null;
  pricingMatchStatus: "matched" | "needs_review" | "manual";
  pricingMatchConfidence: number | null;
  pricingMatchMethod: string | null;
  pricingMatchNotes: string | null;
};

type PricingResult = {
  id: string;
  service_title: string;
  description: string | null;
  category: string | null;
  recommended_price: number;
  unit_label: string | null;
  pricing_catalogs: { name: string } | null;
};

function key() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

export function QuoteEditor({
  quoteId,
  currencyCode,
  initialNotes,
  initialDiscount,
  initialItems,
}: {
  quoteId: string;
  currencyCode: string;
  initialNotes: string | null;
  initialDiscount: number;
  initialItems: Omit<EditableQuoteItem, "clientKey">[];
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [discount, setDiscount] = useState(Number(initialDiscount));
  const [items, setItems] = useState<EditableQuoteItem[]>(
    initialItems.map((item) => ({ ...item, clientKey: key() })),
  );
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogResults, setCatalogResults] = useState<PricingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const subtotal = useMemo(
    () =>
      items
        .filter((item) => ["proposed", "approved"].includes(item.decisionStatus))
        .reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0),
    [items],
  );
  const total = Math.max(subtotal - Number(discount || 0), 0);

  function updateItem(clientKey: string, patch: Partial<EditableQuoteItem>) {
    setItems((current) =>
      current.map((item) => (item.clientKey === clientKey ? { ...item, ...patch } : item)),
    );
  }

  function addBlankItem() {
    setItems((current) => [
      ...current,
      {
        clientKey: key(),
        id: null,
        pricingItemId: null,
        title: "",
        description: "",
        quantity: 1,
        unitLabel: "item",
        unitPrice: 0,
        notes: "",
        decisionStatus: "proposed",
        decisionNotes: "",
        catalogLabel: null,
        pricingMatchStatus: "manual",
        pricingMatchConfidence: null,
        pricingMatchMethod: "human",
        pricingMatchNotes: null,
      },
    ]);
  }

  async function searchCatalog() {
    if (!catalogQuery.trim()) return;
    setIsSearching(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/pricing/search?q=${encodeURIComponent(catalogQuery.trim())}&limit=12`);
      const payload = (await response.json()) as { success?: boolean; items?: PricingResult[]; error?: string };
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Catalogue search failed.");
      setCatalogResults(payload.items ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Catalogue search failed.");
    } finally {
      setIsSearching(false);
    }
  }

  function addCatalogItem(result: PricingResult) {
    setItems((current) => [
      ...current,
      {
        clientKey: key(),
        id: null,
        pricingItemId: result.id,
        title: result.service_title,
        description: result.description ?? "",
        quantity: 1,
        unitLabel: result.unit_label ?? "item",
        unitPrice: Number(result.recommended_price),
        notes: result.category ?? "",
        decisionStatus: "proposed",
        decisionNotes: "",
        catalogLabel: result.pricing_catalogs?.name ?? "Service catalogue",
        pricingMatchStatus: "matched",
        pricingMatchConfidence: 1,
        pricingMatchMethod: "human_catalogue_selection",
        pricingMatchNotes: "Catalogue item selected by an administrator.",
      },
    ]);
    setCatalogResults([]);
    setCatalogQuery("");
  }

  async function save() {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/quotes/${quoteId}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          discountAmount: Number(discount || 0),
          items: items.map((item, index) => ({
            id: item.id,
            lineNo: index + 1,
            title: item.title,
            description: item.description || null,
            quantity: Number(item.quantity),
            unitLabel: item.unitLabel || "item",
            unitPrice: Number(item.unitPrice),
            notes: item.notes || null,
            pricingItemId: item.pricingItemId,
            decisionStatus: item.decisionStatus,
            decisionNotes: item.decisionNotes || null,
            pricingMatchStatus: item.pricingMatchStatus,
            pricingMatchConfidence: item.pricingMatchConfidence,
            pricingMatchMethod: item.pricingMatchMethod,
            pricingMatchNotes: item.pricingMatchNotes,
          })),
        }),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Failed to save quote.");
      setMessage("Quote saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save quote.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="panel quote-editor">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Draft Builder</p>
          <h2>Edit Quote</h2>
        </div>
        <button type="button" className="button button-primary" onClick={save} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Quote"}
        </button>
      </div>

      <div className="quote-catalog-search">
        <label className="field-block">
          <span className="field-label">Add from service catalogue</span>
          <div className="inline-actions">
            <input
              className="input"
              value={catalogQuery}
              onChange={(event) => setCatalogQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void searchCatalog();
                }
              }}
              placeholder="Search plumbing, cleaning, electrical..."
            />
            <button type="button" className="button button-secondary" onClick={searchCatalog} disabled={isSearching}>
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>
        </label>
        {catalogResults.length > 0 ? (
          <div className="quote-catalog-results">
            {catalogResults.map((result) => (
              <button key={result.id} type="button" className="quote-catalog-result" onClick={() => addCatalogItem(result)}>
                <span><strong>{result.service_title}</strong><small>{result.category ?? result.pricing_catalogs?.name}</small></span>
                <strong>{currencyCode} {Number(result.recommended_price).toFixed(2)}</strong>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="quote-edit-items">
        {items.map((item, index) => (
          <article key={item.clientKey} className={`quote-edit-item is-${item.decisionStatus}`}>
            <div className="quote-edit-item-heading">
              <strong>Item {index + 1}</strong>
              <div className="inline-actions">
                {item.catalogLabel ? <span className="helper-text">Catalogue: {item.catalogLabel}</span> : null}
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setItems((current) => current.filter((entry) => entry.clientKey !== item.clientKey))}
                  disabled={items.length === 1}
                >
                  Remove
                </button>
              </div>
            </div>
            {item.pricingMatchStatus === "needs_review" ? (
              <p className="notice notice-warning">No confident catalogue match was found. Enter a price or choose a catalogue item before including this work.</p>
            ) : null}
            <div className="form-grid quote-item-grid">
              <label className="field-block quote-title-field">
                <span className="field-label">Title</span>
                <input className="input" value={item.title} onChange={(event) => updateItem(item.clientKey, { title: event.target.value })} />
              </label>
              <label className="field-block">
                <span className="field-label">Decision</span>
                <select className="input input-select" value={item.decisionStatus} onChange={(event) => updateItem(item.clientKey, { decisionStatus: event.target.value as DecisionStatus })}>
                  <option value="proposed">Proposed</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="deferred">Deferred</option>
                </select>
              </label>
              <label className="field-block quote-description-field">
                <span className="field-label">Description</span>
                <textarea className="input" rows={2} value={item.description} onChange={(event) => updateItem(item.clientKey, { description: event.target.value })} />
              </label>
              <label className="field-block">
                <span className="field-label">Quantity</span>
                <input className="input" type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateItem(item.clientKey, { quantity: Number(event.target.value) })} />
              </label>
              <label className="field-block">
                <span className="field-label">Unit</span>
                <input className="input" value={item.unitLabel} onChange={(event) => updateItem(item.clientKey, { unitLabel: event.target.value })} />
              </label>
              <label className="field-block">
                <span className="field-label">Unit price ({currencyCode})</span>
                <input className="input" type="number" min="0" step="0.01" placeholder="Price required" value={item.pricingMatchStatus === "needs_review" && item.unitPrice === 0 ? "" : item.unitPrice} onChange={(event) => { const unitPrice = Number(event.target.value); updateItem(item.clientKey, { unitPrice, pricingMatchStatus: unitPrice > 0 ? "manual" : item.pricingMatchStatus, pricingMatchConfidence: unitPrice > 0 ? null : item.pricingMatchConfidence, decisionStatus: unitPrice > 0 && item.decisionStatus === "deferred" ? "proposed" : item.decisionStatus }); }} />
              </label>
              <label className="field-block">
                <span className="field-label">Line total</span>
                <input className="input" value={item.pricingMatchStatus === "needs_review" && item.unitPrice === 0 ? "Needs price" : `${currencyCode} ${(item.quantity * item.unitPrice).toFixed(2)}`} readOnly />
              </label>
              <label className="field-block quote-description-field">
                <span className="field-label">Internal / scope notes</span>
                <input className="input" value={item.notes} onChange={(event) => updateItem(item.clientKey, { notes: event.target.value })} />
              </label>
              <label className="field-block quote-description-field">
                <span className="field-label">Decision notes</span>
                <input className="input" value={item.decisionNotes} onChange={(event) => updateItem(item.clientKey, { decisionNotes: event.target.value })} placeholder="Why rejected or deferred?" />
              </label>
            </div>
          </article>
        ))}
      </div>

      <button type="button" className="button button-secondary" onClick={addBlankItem}>Add custom item</button>

      <div className="quote-footer-editor">
        <label className="field-block quote-notes-field">
          <span className="field-label">Customer-facing notes</span>
          <textarea className="input" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <div className="quote-total-editor">
          <div><span>Included subtotal</span><strong>{currencyCode} {subtotal.toFixed(2)}</strong></div>
          <label><span>Discount</span><input className="input" type="number" min="0" max={subtotal} step="0.01" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} /></label>
          <div className="quote-grand-total"><span>Total</span><strong>{currencyCode} {total.toFixed(2)}</strong></div>
        </div>
      </div>
      {message ? <p className="helper-text">{message}</p> : null}
    </section>
  );
}
