import Link from "next/link";
import { getOperationsOverview } from "@/backend/services/reports/get-operations-overview";

function formatMinutes(value: number | null): string {
  if (value === null) return "No data yet";

  if (value < 60) return `${Math.round(value)} min`;

  return `${Math.round(value / 60)} hr`;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="report-metric">
      <p className="report-metric-label">{label}</p>
      <p className="report-metric-value">{value}</p>
      <p className="report-metric-hint">{hint}</p>
    </article>
  );
}

function BarRow({
  label,
  value,
  total,
  meta,
}: {
  label: string;
  value: number;
  total: number;
  meta: string;
}) {
  const width = total > 0 ? Math.max(6, (value / total) * 100) : 0;

  return (
    <div className="report-bar-row">
      <div className="report-bar-row-header">
        <span className="report-bar-label">{label}</span>
        <span className="report-bar-meta">{meta}</span>
      </div>
      <div className="report-bar-track" aria-hidden="true">
        <div className="report-bar-fill" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default async function ReportsPage() {
  const report = await getOperationsOverview();

  const totalSources = report.leadSourceBreakdown.reduce((sum, row) => sum + row.count, 0);
  const totalWorkload = report.workload.reduce((sum, row) => sum + row.openItemCount, 0);
  const topSource = report.insights.topSource;
  const busiestMember = report.insights.busiestMember;

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Reports</h1>
          <p className="page-header-copy">
            A quick read on where leads come from, how fast the team responds, and
            which work needs attention. Use this page to spot bottlenecks before they
            become missed jobs.
          </p>
        </div>
        <Link className="button button-secondary" href="/requests">
          View All Requests
        </Link>
      </section>

      <section className="report-summary-grid">
        <Metric
          label="Lead Conversion"
          value={formatPercent(report.conversion.conversionRate)}
          hint={`${report.conversion.convertedLeads} converted out of ${report.conversion.totalLeads} leads`}
        />
        <Metric
          label="Avg Response"
          value={formatMinutes(report.response.averageResponseMinutes)}
          hint={`${report.response.responseSamples} thread samples used for this estimate`}
        />
        <Metric
          label="Median Response"
          value={formatMinutes(report.response.medianResponseMinutes)}
          hint="Half of measured conversations were answered this fast or faster"
        />
        <Metric
          label="Rework Rate"
          value={formatPercent(report.rework.reworkRate)}
          hint={`${report.rework.reworkItems} flagged items out of ${report.rework.totalItems}`}
        />
      </section>

      <section className="report-insight-grid">
        <article className="panel report-insight-card">
          <p className="eyebrow">What this means</p>
          <h2>Summary</h2>
          <p className="report-copy">
            {topSource
              ? `Most leads currently come from ${topSource.label}.`
              : "No lead source data is available yet."}{" "}
            Response handling is <strong>{report.insights.responseLabel.toLowerCase()}</strong>, and
            work quality is trending <strong>{report.insights.reworkLabel.toLowerCase()}</strong>.
          </p>
          <div className="report-inline-stat">
            <span>Top source</span>
            <strong>
              {topSource ? `${topSource.label} · ${formatPercent(topSource.share)}` : "Empty"}
            </strong>
          </div>
          <div className="report-inline-stat">
            <span>Busiest member</span>
            <strong>
              {busiestMember
                ? `${busiestMember.displayName} · ${busiestMember.openItemCount} open items`
                : "Empty"}
            </strong>
          </div>
        </article>

        <article className="panel report-insight-card">
          <p className="eyebrow">How to read</p>
          <h2>Why these numbers matter</h2>
          <ul className="report-notes">
            <li>Lead conversion tells you whether enquiries are turning into real jobs.</li>
            <li>Response time shows whether the business is answering quickly enough to keep customers warm.</li>
            <li>Rework rate highlights jobs that were deferred, changed, or need extra follow-up.</li>
            <li>Open workload shows whether one person is carrying too much active work.</li>
          </ul>
        </article>
      </section>

      <section className="report-two-column">
        <section className="panel report-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Lead Sources</p>
              <h2>Channel Mix</h2>
              <p className="report-panel-copy">
                This shows where enquiries are coming from and how much each channel
                contributes to the total.
              </p>
            </div>
          </div>

          {report.leadSourceBreakdown.length === 0 ? (
            <p className="report-empty">No lead source data yet.</p>
          ) : (
            <div className="report-bar-list">
              {report.leadSourceBreakdown.map((row) => (
                <BarRow
                  key={row.code}
                  label={row.label}
                  value={row.count}
                  total={totalSources}
                  meta={`${row.count} leads · ${formatPercent(row.share)}`}
                />
              ))}
            </div>
          )}
        </section>

        <section className="panel report-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Response Health</p>
              <h2>Speed</h2>
              <p className="report-panel-copy">
                Faster first replies usually keep more enquiries active and reduce
                back-and-forth.
              </p>
            </div>
          </div>

          <div className="report-speed-grid">
            <Metric
              label="Average"
              value={formatMinutes(report.response.averageResponseMinutes)}
              hint="Mean response time across valid threads"
            />
            <Metric
              label="Median"
              value={formatMinutes(report.response.medianResponseMinutes)}
              hint="Typical response time, less affected by outliers"
            />
          </div>

          <div className="report-inline-stat">
            <span>Status</span>
            <strong>{report.insights.responseLabel}</strong>
          </div>
          <p className="report-panel-copy">
            This is based on {report.response.responseSamples} conversation sample
            {report.response.responseSamples === 1 ? "" : "s"} with both inbound and
            outbound messages.
          </p>
        </section>
      </section>

      <section className="report-two-column">
        <section className="panel report-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Rework</p>
              <h2>Follow-up Load</h2>
              <p className="report-panel-copy">
                Deferred or changed work is a sign that scope, parts, or customer
                decisions need more attention.
              </p>
            </div>
          </div>

          <div className="report-speed-grid">
            <Metric
              label="Flagged Items"
              value={String(report.rework.reworkItems)}
              hint="Items marked deferred or requiring changes"
            />
            <Metric
              label="Total Items"
              value={String(report.rework.totalItems)}
              hint="All tracked work items in the system"
            />
          </div>

          <div className="report-inline-stat">
            <span>Quality signal</span>
            <strong>{report.insights.reworkLabel}</strong>
          </div>
        </section>

        <section className="panel report-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Team Load</p>
              <h2>Open Work</h2>
              <p className="report-panel-copy">
                This ranks staff by open assignments so you can spot overload early.
              </p>
            </div>
          </div>

          {report.workload.length === 0 ? (
            <p className="report-empty">No workload data yet.</p>
          ) : (
            <div className="report-bar-list">
              {report.workload.map((row) => (
                <BarRow
                  key={row.profileId}
                  label={row.displayName}
                  value={row.openItemCount}
                  total={Math.max(totalWorkload, 1)}
                  meta={`${row.openItemCount} open · ${row.assignedLeadCount} leads · ${row.assignedItemCount} items`}
                />
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
