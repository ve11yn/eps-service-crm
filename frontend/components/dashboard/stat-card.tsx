export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <article className="panel stat-card">
      <div className="stat-card-top">
        <p className="stat-card-label">{label}</p>
        <p className="stat-card-value">{value}</p>
      </div>
      {hint ? <p className="stat-card-hint">{hint}</p> : null}
    </article>
  );
}
