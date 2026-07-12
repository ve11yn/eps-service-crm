import "server-only";

import { logAuditEvent } from "@/backend/observability/audit";
import { updateProject } from "@/backend/repositories";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";
import { getFinanceConfiguration } from "@/backend/services/settings/get-finance-configuration";
import { buildInvoiceNumber, calculateInvoiceAmounts } from "@/lib/crm/finance-configuration";

export async function getInvoiceDetail(invoiceId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("invoices").select(`
    *, invoice_items (*), payments (*),
    projects:project_id (*, contacts:primary_contact_id (*), properties:primary_property_id (*))
  `).eq("id", invoiceId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createInvoiceFromProject(input: { projectId: string; profileId: string }) {
  const supabase = createAdminSupabaseClient();
  const configuration = await getFinanceConfiguration();
  const { data: existing } = await supabase.from("invoices").select("id").eq("project_id", input.projectId).neq("status_code", "cancelled").maybeSingle();
  if (existing) return getInvoiceDetail(existing.id);

  const { data: project, error } = await supabase.from("projects").select(`
    id, status_code, title,
    project_items (id, title, description, quoted_amount, status_code, is_deferred),
    quotes (id, status_code)
  `).eq("id", input.projectId).maybeSingle();
  if (error) throw error;
  if (!project) throw new Error("Project not found.");
  if (project.status_code !== "qa_review") throw new Error("Invoice can be created after the project enters QA / Review.");

  const items = (Array.isArray(project.project_items) ? project.project_items : []).filter((item) => !item.is_deferred && item.status_code !== "deferred");
  if (!items.length) throw new Error("Project has no billable work items.");
  const amounts = calculateInvoiceAmounts(items.reduce((sum, item) => sum + Number(item.quoted_amount), 0), configuration.taxRate);
  const quote = (Array.isArray(project.quotes) ? project.quotes : []).find((entry) => entry.status_code === "approved");
  const now = new Date();
  const due = new Date(now.getTime() + configuration.paymentTermsDays * 86400000).toISOString();
  const { data: invoice, error: invoiceError } = await supabase.from("invoices").insert({
    project_id: project.id, quote_id: quote?.id ?? null,
    invoice_number: buildInvoiceNumber(configuration.invoicePrefix, now, crypto.randomUUID().slice(0, 8)), status_code: "draft",
    created_by_profile_id: input.profileId, subtotal_amount: amounts.subtotal,
    tax_amount: amounts.taxAmount, tax_rate: configuration.taxRate,
    total_amount: amounts.total, balance_due_amount: amounts.total,
    due_at: due, payment_terms_days: configuration.paymentTermsDays,
    notes: configuration.defaultInvoiceNotes, customer_notes: configuration.paymentInstructions,
  }).select("*").single();
  if (invoiceError) throw invoiceError;
  const { error: itemsError } = await supabase.from("invoice_items").insert(items.map((item, index) => ({
    invoice_id: invoice.id, project_item_id: item.id, line_no: index + 1, title: item.title,
    description: item.description, quantity: 1, unit_label: "item", unit_price: Number(item.quoted_amount), total_price: Number(item.quoted_amount),
  })));
  if (itemsError) throw itemsError;
  await logAuditEvent({ action: "invoices.create", entityType: "invoice", entityId: invoice.id, performedByProfileId: input.profileId, newValue: invoice as unknown as Json, metadata: { project_id: project.id, configuration: { payment_terms_days: configuration.paymentTermsDays, tax_name: configuration.taxName, tax_rate: configuration.taxRate } } });
  return getInvoiceDetail(invoice.id);
}

export async function saveInvoiceDraft(input: { invoiceId: string; profileId: string; dueAt: string | null; taxRate: number; paymentTermsDays: number; notes: string | null; customerNotes: string | null; items: unknown[] }) {
  const supabase = createAdminSupabaseClient();
  const before = await getInvoiceDetail(input.invoiceId);
  const { error } = await supabase.rpc("save_invoice_draft_atomic", {
    p_invoice_id: input.invoiceId, p_due_at: input.dueAt as string, p_tax_rate: input.taxRate,
    p_payment_terms_days: input.paymentTermsDays, p_notes: input.notes as string, p_customer_notes: input.customerNotes as string,
    p_items: input.items as Json,
  });
  if (error) throw error;
  const after = await getInvoiceDetail(input.invoiceId);
  await logAuditEvent({ action: "invoices.update_draft", entityType: "invoice", entityId: input.invoiceId, performedByProfileId: input.profileId, oldValue: before as unknown as Json, newValue: after as unknown as Json });
  return after;
}

export async function issueInvoice(input: { invoiceId: string; profileId: string }) {
  const invoice = await getInvoiceDetail(input.invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status_code !== "draft") throw new Error("Only a draft invoice can be issued.");
  if (!invoice.due_at || Number(invoice.total_amount) <= 0) throw new Error("Invoice needs a due date and positive total.");
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("invoices").update({ status_code: "issued", issued_at: now }).eq("id", invoice.id).select("*").single();
  if (error) throw error;
  await updateProject(invoice.project_id, { status_code: "invoiced" });
  await logAuditEvent({ action: "invoices.issue", entityType: "invoice", entityId: invoice.id, performedByProfileId: input.profileId, oldValue: invoice as unknown as Json, newValue: data as unknown as Json });
  await logAuditEvent({ action: "projects.status_transition", entityType: "project", entityId: invoice.project_id, performedByProfileId: input.profileId, oldValue: { status_code: invoice.projects?.status_code ?? null }, newValue: { status_code: "invoiced" }, metadata: { invoice_id: invoice.id } });
  return data;
}

export async function recordPayment(input: { invoiceId: string; profileId: string; amount: number; method: string; reference: string | null; notes: string | null }) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Payment amount must be greater than zero.");
  const invoice = await getInvoiceDetail(input.invoiceId);
  if (!invoice || !["issued", "partially_paid", "overdue"].includes(invoice.status_code)) throw new Error("Invoice is not open for payment.");
  if (input.amount > Number(invoice.balance_due_amount)) throw new Error("Payment exceeds the outstanding balance.");
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("payments").insert({
    project_id: invoice.project_id, invoice_id: invoice.id, status_code: "processing", amount: input.amount,
    payment_method: input.method, reference_number: input.reference, notes: input.notes, reported_at: new Date().toISOString(),
  }).select("*").single();
  if (error) throw error;
  await logAuditEvent({ action: "payments.record", entityType: "payment", entityId: data.id, performedByProfileId: input.profileId, newValue: data as unknown as Json, metadata: { invoice_id: invoice.id } });
  return data;
}

export async function verifyPayment(input: { paymentId: string; profileId: string }) {
  const supabase = createAdminSupabaseClient();
  const { data: before, error: beforeError } = await supabase.from("payments").select("*").eq("id", input.paymentId).single();
  if (beforeError) throw beforeError;
  const { data: payment, error } = await supabase.from("payments").update({ status_code: "paid", verified_at: new Date().toISOString(), verified_by_profile_id: input.profileId }).eq("id", input.paymentId).select("*").single();
  if (error) throw error;
  const { data: paidRows, error: paidError } = await supabase.from("payments").select("amount").eq("invoice_id", payment.invoice_id!).eq("status_code", "paid");
  if (paidError) throw paidError;
  const invoice = await getInvoiceDetail(payment.invoice_id!);
  if (!invoice) throw new Error("Invoice not found.");
  const paid = (paidRows ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
  const balance = Math.max(Number(invoice.total_amount) - paid, 0);
  await supabase.from("invoices").update({ status_code: balance === 0 ? "paid" : "partially_paid", balance_due_amount: balance, paid_at: balance === 0 ? new Date().toISOString() : null }).eq("id", invoice.id);
  await logAuditEvent({ action: "payments.verify", entityType: "payment", entityId: payment.id, performedByProfileId: input.profileId, oldValue: before as unknown as Json, newValue: payment as unknown as Json, metadata: { invoice_id: invoice.id, invoice_balance_before: invoice.balance_due_amount, invoice_balance_after: balance } });
  return payment;
}

export async function refreshOverdueInvoices() {
  const supabase = createAdminSupabaseClient();
  await supabase.from("invoices").update({ status_code: "overdue" }).in("status_code", ["issued", "partially_paid"]).lt("due_at", new Date().toISOString()).gt("balance_due_amount", 0);
}
