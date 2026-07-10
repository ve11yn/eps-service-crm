import { getOperationsOverview } from "@/backend/services/reports/get-operations-overview";
import { requireAppSession } from "@/lib/auth/session";

function formatMinutes(value: number | null): string {
  if (value === null) return "-";
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

function ReportStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="report-stat">
      <span className="report-stat-label">{label}</span>
      <strong className="report-stat-value">{value}</strong>
      <span className="report-stat-hint">{hint}</span>
    </div>
  );
}

function BarRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const share = total > 0 ? formatPercent(value / total) : "-";
  const width = total > 0 ? Math.max(4, (value / total) * 100) : 0;

  return (
    <div className="report-load-row">
      <div className="report-load-row-header">
        <div className="report-load-main">
          <span className="report-load-label">{label}</span>
          <span className="report-load-meta">{share} of open workload</span>
        </div>
        <span className="report-load-count">{value} open</span>
      </div>
      <div className="report-load-track" aria-hidden="true">
        <div className="report-load-fill" style={{ width: `${width}%` }} />
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
        <div className="report-side-stack">
          <article className="panel report-section">
            <div className="panel-header report-section-header">
              <div>
                <h2>Speed</h2>
              </div>
              <span className="helper-text">{report.insights.responseLabel}</span>
            </div>

            <div className="report-speed-grid">
              <ReportStat
                label="Average"
                value={formatMinutes(report.response.averageResponseMinutes)}
                hint="Mean response time"
              />
              <ReportStat
                label="Median"
                value={formatMinutes(report.response.medianResponseMinutes)}
                hint="Typical response time"
              />
            </div>
          </article>

          <article className="panel report-section">
            <div className="panel-header report-section-header">
              <div>
                <h2>Follow-up Load</h2>
              </div>
              <span className="helper-text">{report.insights.reworkLabel}</span>
            </div>

            <div className="report-followup-card">
              <div className="report-followup-primary">
                <span>Rework rate</span>
                <strong>{formatPercent(report.rework.reworkRate)}</strong>
              </div>
              <div className="report-load-track" aria-hidden="true">
                <div
                  className="report-load-fill"
                  style={{ width: `${Math.max(4, report.rework.reworkRate * 100)}%` }}
                />
              </div>
              <div className="report-followup-grid">
                <ReportStat
                  label="Flagged Items"
                  value={String(report.rework.reworkItems)}
                  hint="Deferred or changed"
                />
                <ReportStat
                  label="Total Items"
                  value={String(report.rework.totalItems)}
                  hint="All tracked work items"
                />
              </div>
            </div>
          </article>
        </div>

        <article className="panel report-section report-work-section">
          <div className="panel-header report-section-header">
            <div>
              <h2>Open Work</h2>
            </div>
            <span className="helper-text">
              {busiestMember ? `${busiestMember.displayName} busiest` : "-"}
            </span>
          </div>

          {report.workload.length === 0 ? (
            <p className="report-empty">-</p>
          ) : (
            <div className="report-scroll-panel">
              <div className="report-load-list">
                {report.workload.map((row) => (
                  <BarRow
                    key={row.profileId}
                    label={row.displayName}
                    value={row.openItemCount}
                    total={Math.max(totalWorkload, 1)}
                  />
                ))}
              </div>
            </div>
          )}
        </article>

      </section>
    </div>
  );
}
