type MetricCardProps = {
  label: string;
  value: number | string;
  detail?: string;
};

export default function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <article className="metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      {detail ? <p className="metric-detail">{detail}</p> : null}
    </article>
  );
}
