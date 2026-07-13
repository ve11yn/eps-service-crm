import Link from "next/link";
import { getOperationsOverview } from "@/backend/services/reports/get-operations-overview";
import { formatMoney } from "@/frontend/lib/format";
import { requireAppSession } from "@/lib/auth/session";

type ReportsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function hours(value: number | null) {
  return value === null ? "—" : `${value.toFixed(1)} hr`;
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="panel report-metric">
      <p className="report-metric-label">{label}</p>
      <p className="report-metric-value">{value}</p>
      <p className="report-metric-hint">{hint}</p>
    </article>
  );
}

function BreakdownRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="report-data-row">
      <strong>{label}</strong>
      <div className="report-data-values">
        {values.map((value, index) => (
          <span key={`${value}-${index}`}>{value}</span>
        ))}
      </div>
    </div>
  );
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  await requireAppSession(["owner"]);

  const params = await searchParams;
  const one = (key: string) => (typeof params[key] === "string" ? params[key] : "");
  const filters = {
    from: one("from"),
    to: one("to"),
    workerId: one("workerId"),
    service: one("service"),
    source: one("source"),
  };
  const report = await getOperationsOverview(filters);
  const query = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });

  return (
    <div className="page-stack report-page">
      <section className="page-header report-page-header">
        <div>
          <h1>Reports &amp; Performance</h1>
          <p className="helper-text">
            Operational and financial metrics use the selected date range and dimensions.
          </p>
        </div>
        <Link className="button button-secondary" href={`/api/reports/export?${query.toString()}`}>
          Export CSV
        </Link>
      </section>

      <section className="panel report-filter-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Filters</p>
            <h2>Report scope</h2>
          </div>
        </div>
        <form className="report-filter-grid" method="get">
          <label className="field-block">
            <span className="field-label">From</span>
            <input className="input" type="date" name="from" defaultValue={filters.from} />
          </label>
          <label className="field-block">
            <span className="field-label">To</span>
            <input className="input" type="date" name="to" defaultValue={filters.to} />
          </label>
          <label className="field-block">
            <span className="field-label">Worker</span>
            <select className="input input-select" name="workerId" defaultValue={filters.workerId}>
              <option value="">All workers</option>
              {report.filterOptions.workers.map((option) => (
                <option value={option.id} key={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="field-block">
            <span className="field-label">Service</span>
            <select className="input input-select" name="service" defaultValue={filters.service}>
              <option value="">All services</option>
              {report.filterOptions.services.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="field-block">
            <span className="field-label">Lead source</span>
            <select className="input input-select" name="source" defaultValue={filters.source}>
              <option value="">All sources</option>
              {report.filterOptions.sources.map((option) => (
                <option value={option.id} key={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
          <button className="button button-primary report-filter-submit">Apply filters</button>
        </form>
      </section>

      <section className="report-kpi-grid" aria-label="Key performance indicators">
        <Metric
          label="Lead → Quote"
          value={percent(report.conversion.leadToQuoteRate)}
          hint={`${report.conversion.leadsWithQuote} of ${report.conversion.totalLeads} distinct leads`}
        />
        <Metric
          label="Quote → Job"
          value={percent(report.conversion.quoteToJobRate)}
          hint={`${report.conversion.quotesWithJob} of ${report.conversion.totalQuotes} quotes`}
        />
        <Metric label="Revenue received" value={formatMoney(report.finance.revenue)} hint="Verified payments" />
        <Metric label="Outstanding" value={formatMoney(report.finance.outstanding)} hint="Open invoice balances" />
        <Metric label="Tracked cost" value={formatMoney(report.finance.totalCost)} hint="Work-item and purchase costs" />
        <Metric label="Margin" value={formatMoney(report.finance.margin)} hint={percent(report.finance.marginRate)} />
        <Metric
          label="Avg completion"
          value={hours(report.completion.averageHours)}
          hint={`${report.completion.completedJobs} completed jobs`}
        />
        <Metric
          label="Complaint rate"
          value={percent(report.complaints.rate)}
          hint={`${report.complaints.count} complaint signals`}
        />
      </section>

      <section className="report-breakdown-grid">
        <article className="panel report-breakdown-card">
          <div className="panel-header"><h2>Lead Sources</h2></div>
          <div className="report-data-list">
            {report.leadSourceBreakdown.map((row) => (
              <BreakdownRow
                key={row.code}
                label={row.label}
                values={[`${row.count} leads`, percent(row.share)]}
              />
            ))}
            {!report.leadSourceBreakdown.length ? <p className="report-empty">No leads in this selection.</p> : null}
          </div>
        </article>

        <article className="panel report-breakdown-card">
          <div className="panel-header"><h2>Payment Ageing</h2></div>
          <div className="report-data-list">
            {report.paymentAgeing.map((row) => (
              <BreakdownRow
                key={row.label}
                label={row.label}
                values={[`${row.count} invoices`, formatMoney(row.balance)]}
              />
            ))}
          </div>
        </article>

        <article className="panel report-breakdown-card">
          <div className="panel-header"><h2>Worker Utilisation</h2></div>
          <div className="report-data-list">
            {report.workerUtilisation.map((row) => (
              <BreakdownRow
                key={row.profileId}
                label={row.displayName}
                values={[
                  `${row.completed}/${row.assigned} completed`,
                  percent(row.utilisationRate),
                  `${row.open} open`,
                ]}
              />
            ))}
            {!report.workerUtilisation.length ? <p className="report-empty">No worker activity in this selection.</p> : null}
          </div>
        </article>

        <article className="panel report-breakdown-card">
          <div className="panel-header">
            <h2>Rework Causes</h2>
            <span className="helper-text">{percent(report.rework.rate)} rate</span>
          </div>
          <div className="report-data-list">
            {report.rework.causes.map((row) => (
              <BreakdownRow
                key={row.label}
                label={row.label}
                values={[`${row.count} occurrence${row.count === 1 ? "" : "s"}`]}
              />
            ))}
            {!report.rework.causes.length ? <p className="report-empty">No rework recorded.</p> : null}
          </div>
        </article>
      </section>

      <section className="panel report-service-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Performance</p>
            <h2>Service-category Performance</h2>
          </div>
        </div>
        {report.servicePerformance.length ? (
          <div className="report-table-scroll">
            <table className="data-table report-service-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Jobs</th>
                  <th>Items completed</th>
                  <th>Revenue</th>
                  <th>Cost</th>
                  <th>Margin</th>
                  <th>Rework</th>
                </tr>
              </thead>
              <tbody>
                {report.servicePerformance.map((row) => (
                  <tr key={row.service}>
                    <td>{row.service}</td>
                    <td>{row.jobs}</td>
                    <td>{row.completed}/{row.items}</td>
                    <td>{formatMoney(row.revenue)}</td>
                    <td>{formatMoney(row.cost)}</td>
                    <td>{formatMoney(row.margin)}</td>
                    <td>{row.rework}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="report-empty">No service performance data in this selection.</p>
        )}
      </section>
    </div>
  );
}
