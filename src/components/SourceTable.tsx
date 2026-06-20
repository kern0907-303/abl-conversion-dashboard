import type { SourceMetrics } from "../analytics/types";

type SourceTableProps = {
  sources: SourceMetrics[];
};

export default function SourceTable({ sources }: SourceTableProps) {
  return (
    <section className="dashboard-section" aria-labelledby="source-heading">
      <div className="section-header">
        <h2 id="source-heading">來源分析</h2>
      </div>
      {sources.length === 0 ? (
        <p className="empty-state">目前期間沒有來源資料。</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>來源</th>
                <th>來訪總次數</th>
                <th>不重複訪客</th>
                <th>總轉換次數</th>
                <th>完成付款</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.source}>
                  <th scope="row">{source.source}</th>
                  <td>{source.page_views}</td>
                  <td>{source.unique_visitors}</td>
                  <td>{source.total_conversions}</td>
                  <td>{source.payment_success}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
