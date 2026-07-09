import Link from "next/link";
import { getOperationsOverview } from "@/backend/services/reports/get-operations-overview";
import { requireAppSession } from "@/lib/auth/session";

function formatMinutes(value: number | null): string {
  if (value === null) return "No data";
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
    <article className="panel report-metric">
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
  await requireAppSession(["owner"]);
  const report = await getOperationsOverview();

  const totalWorkload = report.workload.reduce((sum, row) => sum + row.openItemCount, 0);
  const busiestMember = report.insights.busiestMember;

  return (
    <div className="page-stack report-page">
      <section className="page-header report-page-header">
        <div>
          <h1>Reports</h1>

        </div>
        <Link className="button button-secondary" href="/requests">
          View All Requests
        </Link>
      </section>

      <section className="stats-grid report-kpi-grid">
        <Metric
          label="Quote Conversion"
          value={formatPercent(report.conversion.conversionRate)}
          hint={`${report.conversion.convertedLeads} / ${report.conversion.totalLeads} quotes`}
        />
        <Metric
          label="Avg Response"
          value={formatMinutes(report.response.averageResponseMinutes)}
          hint={`${report.response.responseSamples} thread samples`}
        />
        <Metric
          label="Median Response"
          value={formatMinutes(report.response.medianResponseMinutes)}
          hint="Typical first reply time"
        />
        <Metric
          label="Rework Rate"
          value={formatPercent(report.rework.reworkRate)}
          hint={`${report.rework.reworkItems} of ${report.rework.totalItems} items`}
        />
      </section>

      <section className="report-stack">
        <article className="panel report-section">
          <div className="panel-header report-section-header">
            <div>
              <p className="eyebrow">Response Time</p>
              <h2>Speed</h2>
            </div>
            <span className="helper-text">{report.insights.responseLabel}</span>
          </div>

          <div className="report-speed-grid">
            <Metric
              label="Average"
              value={formatMinutes(report.response.averageResponseMinutes)}
              hint="Mean response time"
            />
            <Metric
              label="Median"
              value={formatMinutes(report.response.medianResponseMinutes)}
              hint="Typical response time"
            />
          </div>
        </article>

        <article className="panel report-section">
          <div className="panel-header report-section-header">
            <div>
              <p className="eyebrow">Workload</p>
              <h2>Open Work</h2>
            </div>
            <span className="helper-text">
              {busiestMember ? `${busiestMember.displayName} busiest` : "No workload data"}
            </span>
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
                  meta={`${row.openItemCount} open`}
                />
              ))}
            </div>
          )}
        </article>

        <article className="panel report-section">
          <div className="panel-header report-section-header">
            <div>
              <p className="eyebrow">Rework</p>
              <h2>Follow-up Load</h2>
            </div>
            <span className="helper-text">{report.insights.reworkLabel}</span>
          </div>

          <div className="report-speed-grid">
            <Metric
              label="Flagged Items"
              value={String(report.rework.reworkItems)}
              hint="Deferred or changed"
            />
            <Metric
              label="Total Items"
              value={String(report.rework.totalItems)}
              hint="All tracked work items"
            />
          </div>
        </article>
      </section>
    </div>
  );
}
