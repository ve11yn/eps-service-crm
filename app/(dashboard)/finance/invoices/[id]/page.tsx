import { notFound } from "next/navigation";
import { getInvoiceDetail } from "@/backend/services/finance/invoice-operations";
import { requireAppSession } from "@/lib/auth/session";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";
import { InvoiceEditor } from "@/frontend/components/finance/invoice-editor";
import { PaymentActions } from "@/frontend/components/finance/payment-actions";
import { QuickBooksSync } from "@/frontend/components/finance/quickbooks-sync";
import { BackButton } from "@/frontend/components/navigation/back-button";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAppSession(["owner", "admin"]); const { id } = await params; const invoice = await getInvoiceDetail(id); if (!invoice) notFound();
  const items = Array.isArray(invoice.invoice_items) ? invoice.invoice_items : []; const payments = Array.isArray(invoice.payments) ? invoice.payments : [];
  return <div className="page-stack"><section className="page-header"><div className="page-header-title-row"><BackButton fallbackHref="/finance" label="Back" iconOnly className="back-icon-button"/><h1>{invoice.invoice_number}</h1></div><div className="inline-actions"><a className="button button-secondary" href={`/api/invoices/${invoice.id}/pdf`}>Download PDF</a><StatusBadge status={invoice.status_code}/></div></section><QuickBooksSync invoiceId={invoice.id} syncId={invoice.quickbooks_sync_id}/><InvoiceEditor invoiceId={invoice.id} status={invoice.status_code} initialDueAt={invoice.due_at} initialTaxRate={Number(invoice.tax_rate)} initialTerms={invoice.payment_terms_days} initialNotes={invoice.notes} initialCustomerNotes={invoice.customer_notes} initialItems={items.map(item=>({id:item.id,title:item.title,description:item.description??"",quantity:Number(item.quantity),unitLabel:item.unit_label??"item",unitPrice:Number(item.unit_price),notes:item.notes??""}))}/><PaymentActions invoiceId={invoice.id} balance={Number(invoice.balance_due_amount)} payments={payments.map(payment=>({id:payment.id,amount:Number(payment.amount),status_code:payment.status_code}))}/></div>;
}
