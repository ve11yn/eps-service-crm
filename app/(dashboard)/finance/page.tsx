import Link from "next/link";
import { EmptyState } from "@/frontend/components/dashboard/empty-state";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";
import { formatDate, formatMoney } from "@/frontend/lib/format";
import { requireAppSession } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { CreateInvoice } from "@/frontend/components/finance/create-invoice";
import { refreshOverdueInvoices } from "@/backend/services/finance/invoice-operations";

async function getFinanceRows() {
  const supabase = createAdminSupabaseClient();
  await refreshOverdueInvoices();
  const [invoicesResult, paymentsResult, projectsResult] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, project_id, quote_id, invoice_number, status_code, total_amount, balance_due_amount, issued_at, due_at, paid_at, quickbooks_sync_id, projects:project_id (id, title, project_code)")
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("id, project_id, invoice_id, status_code, amount, payment_method, reference_number, reported_at, verified_at, projects:project_id (id, title, project_code)")
      .order("created_at", { ascending: false }),
    supabase.from("projects").select("id,title").eq("status_code","qa_review").order("created_at",{ascending:false}),
  ]);

  if (invoicesResult.error) throw invoicesResult.error;
  if (paymentsResult.error) throw paymentsResult.error;
  if (projectsResult.error) throw projectsResult.error;

  return {
    invoices: invoicesResult.data ?? [],
    payments: paymentsResult.data ?? [],
    qaProjects: projectsResult.data ?? [],
  };
}

export default async function FinancePage() {
  await requireAppSession(["owner", "admin"]);
  const finance = await getFinanceRows();

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <h1>Finance</h1>
        </div>
      </section>
      <section className="panel"><div className="panel-header"><div><p className="eyebrow">Actions</p><h2>Finance Operations</h2></div><div className="inline-actions"><a className="button button-secondary" href="/api/finance/export">Export CSV</a><a className="button button-secondary" href="/api/finance/export?format=quickbooks">QuickBooks CSV</a></div></div><CreateInvoice projects={finance.qaProjects} /></section>

      <section className="panel table-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Invoices</p>
            <h2>{finance.invoices.length} invoices</h2>
          </div>
        </div>
        {finance.invoices.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            description="Invoices should be generated after QA / Review and before project completion."
          />
        ) : (
          <div className="review-draft-list">
            <div className="review-draft-list-head" aria-hidden="true">
              <span>Invoice</span>
              <span>Status</span>
              <span>Issued</span>
              <span>Due</span>
              <span>Balance</span>
            </div>
            {finance.invoices.map((invoice) => {
              const project = Array.isArray(invoice.projects)
                ? invoice.projects[0]
                : invoice.projects;

              return (
                <Link
                  key={invoice.id}
                  href={`/finance/invoices/${invoice.id}`}
                  className="review-draft-row"
                >
                  <div className="review-draft-meta-group">
                    <strong className="review-draft-title">{project?.title ?? "Invoice"}</strong>
                    <span className="review-draft-meta">{project ? "Project invoice" : "Unlinked invoice"}</span>
                  </div>
                  <StatusBadge status={invoice.status_code} />
                  <span>{formatDate(invoice.issued_at)}</span>
                  <span>{formatDate(invoice.due_at)}</span>
                  <span>{formatMoney(invoice.balance_due_amount)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel table-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Payments</p>
            <h2>{finance.payments.length} payments</h2>
          </div>
        </div>
        {finance.payments.length === 0 ? (
          <EmptyState
            title="No payments yet"
            description="Payment records will appear after invoice issue or PayNow proof review."
          />
        ) : (
          <div className="review-draft-list">
            <div className="review-draft-list-head" aria-hidden="true">
              <span>Payment</span>
              <span>Status</span>
              <span>Method</span>
              <span>Reported</span>
              <span>Amount</span>
            </div>
            {finance.payments.map((payment) => {
              const project = Array.isArray(payment.projects)
                ? payment.projects[0]
                : payment.projects;

              return (
                <Link
                  key={payment.id}
                  href={project ? `/projects/${project.id}` : "/finance"}
                  className="review-draft-row"
                >
                  <div className="review-draft-meta-group">
                    <strong className="review-draft-title">{project?.title ?? "Payment"}</strong>
                    <span className="review-draft-meta">{project ? "Project payment" : "Unlinked payment"}</span>
                  </div>
                  <StatusBadge status={payment.status_code} />
                  <span>{payment.payment_method ?? "Not set"}</span>
                  <span>{formatDate(payment.reported_at)}</span>
                  <span>{formatMoney(payment.amount)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
