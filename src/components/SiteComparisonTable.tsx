import type { SiteMetrics } from "../analytics/types";

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

type SiteComparisonTableProps = {
  sites: SiteMetrics[];
  crossSiteUniqueVisitors: number;
};

export default function SiteComparisonTable({ sites, crossSiteUniqueVisitors }: SiteComparisonTableProps) {
  const total = sites.reduce(
    (acc, site) => ({
      page_views: acc.page_views + site.page_views,
      quiz_start: acc.quiz_start + site.quiz_start,
      quiz_complete: acc.quiz_complete + site.quiz_complete,
      lead_form_view: acc.lead_form_view + site.lead_form_view,
      assessment_submit: acc.assessment_submit + site.assessment_submit,
      result_view: acc.result_view + site.result_view,
      audio_purchase_click: acc.audio_purchase_click + site.audio_purchase_click,
      recommended_audio_click: acc.recommended_audio_click + site.recommended_audio_click,
      line_click: acc.line_click + site.line_click,
      consultation_booking: acc.consultation_booking + site.consultation_booking,
      payment_success: acc.payment_success + site.payment_success
    }),
    {
      page_views: 0,
      quiz_start: 0,
      quiz_complete: 0,
      lead_form_view: 0,
      assessment_submit: 0,
      result_view: 0,
      audio_purchase_click: 0,
      recommended_audio_click: 0,
      line_click: 0,
      consultation_booking: 0,
      payment_success: 0
    }
  );
  const totalPaymentRate = crossSiteUniqueVisitors === 0 ? 0 : total.payment_success / crossSiteUniqueVisitors;

  return (
    <section className="dashboard-section" aria-labelledby="site-comparison-heading">
      <div className="section-header">
        <h2 id="site-comparison-heading">雙站比較</h2>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>網站</th>
              <th>來訪總次數</th>
              <th>不重複訪客</th>
              <th>開始檢測</th>
              <th>完成檢測</th>
              <th>看到留資表單</th>
              <th>送出 Email</th>
              <th>查看完整結果</th>
              <th>點擊購買音頻</th>
              <th>點擊推薦音頻</th>
              <th>加入 LINE</th>
              <th>預約諮詢</th>
              <th>完成付款</th>
              <th>付款轉換率</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((site) => (
              <tr key={site.site_id}>
                <th scope="row">{site.site_label}</th>
                <td>{site.page_views}</td>
                <td>{site.unique_visitors}</td>
                <td>{site.quiz_start}</td>
                <td>{site.quiz_complete}</td>
                <td>{site.lead_form_view}</td>
                <td>{site.assessment_submit}</td>
                <td>{site.result_view}</td>
                <td>{site.audio_purchase_click}</td>
                <td>{site.recommended_audio_click}</td>
                <td>{site.line_click}</td>
                <td>{site.consultation_booking}</td>
                <td>{site.payment_success}</td>
                <td>{percent(site.payment_conversion_rate)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <th scope="row">合計</th>
              <td>{total.page_views}</td>
              <td>{crossSiteUniqueVisitors}</td>
              <td>{total.quiz_start}</td>
              <td>{total.quiz_complete}</td>
              <td>{total.lead_form_view}</td>
              <td>{total.assessment_submit}</td>
              <td>{total.result_view}</td>
              <td>{total.audio_purchase_click}</td>
              <td>{total.recommended_audio_click}</td>
              <td>{total.line_click}</td>
              <td>{total.consultation_booking}</td>
              <td>{total.payment_success}</td>
              <td>{percent(totalPaymentRate)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
