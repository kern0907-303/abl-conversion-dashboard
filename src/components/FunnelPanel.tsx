import { EVENT_LABELS } from "../analytics/constants";
import type { DashboardSummary } from "../analytics/types";

type FunnelPanelProps = {
  summary: DashboardSummary;
};

function percent(value: number, total: number) {
  if (total === 0) {
    return "0.0%";
  }

  return `${((value / total) * 100).toFixed(1)}%`;
}

export default function FunnelPanel({ summary }: FunnelPanelProps) {
  const visitors = summary.overview.unique_visitors;
  const steps = [
    { label: "來訪", value: summary.overview.page_views },
    { label: EVENT_LABELS.quiz_start, value: summary.sites.reduce((total, site) => total + site.quiz_start, 0) },
    { label: EVENT_LABELS.quiz_complete, value: summary.sites.reduce((total, site) => total + site.quiz_complete, 0) },
    { label: EVENT_LABELS.assessment_submit, value: summary.sites.reduce((total, site) => total + site.assessment_submit, 0) },
    { label: EVENT_LABELS.result_view, value: summary.sites.reduce((total, site) => total + site.result_view, 0) },
    { label: EVENT_LABELS.audio_purchase_click, value: summary.sites.reduce((total, site) => total + site.audio_purchase_click, 0) },
    {
      label: EVENT_LABELS.recommended_audio_click,
      value: summary.sites.reduce((total, site) => total + site.recommended_audio_click, 0)
    },
    { label: EVENT_LABELS.line_click, value: summary.sites.reduce((total, site) => total + site.line_click, 0) },
    {
      label: EVENT_LABELS.consultation_booking,
      value: summary.sites.reduce((total, site) => total + site.consultation_booking, 0)
    },
    { label: EVENT_LABELS.payment_success, value: summary.overview.payment_success }
  ];

  return (
    <section className="dashboard-section" aria-labelledby="funnel-heading">
      <div className="section-header">
        <h2 id="funnel-heading">轉換漏斗</h2>
        <span>{visitors} 位不重複訪客</span>
      </div>
      <div className="funnel-list">
        {steps.map((step) => (
          <div className="funnel-row" key={step.label}>
            <div>
              <span className="funnel-label">{step.label}</span>
              <span className="funnel-rate">{percent(step.value, visitors)}</span>
            </div>
            <strong>{step.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
