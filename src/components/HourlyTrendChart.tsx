import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { HourlyTrend } from "../analytics/types";

type HourlyTrendChartProps = {
  hourlyTrends: HourlyTrend[];
};

function hasActivity(hourlyTrends: HourlyTrend[]) {
  return hourlyTrends.some(
    (row) =>
      row.page_views > 0 ||
      row.unique_visitors > 0 ||
      row.quiz_complete > 0 ||
      row.assessment_submit > 0 ||
      row.audio_purchase_click > 0 ||
      row.line_click > 0 ||
      row.consultation_booking > 0 ||
      row.payment_success > 0
  );
}

export default function HourlyTrendChart({ hourlyTrends }: HourlyTrendChartProps) {
  return (
    <section className="dashboard-section trend-section" aria-labelledby="hourly-trend-heading">
      <div className="section-header">
        <h2 id="hourly-trend-heading">訪問時段分布</h2>
      </div>
      {!hasActivity(hourlyTrends) ? (
        <p className="empty-state">目前期間沒有時段資料。</p>
      ) : (
        <div className="chart-frame">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourlyTrends} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="#d9dee8" strokeDasharray="3 3" />
              <XAxis dataKey="hour" interval={1} tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={40} />
              <Tooltip />
              <Legend />
              <Line dataKey="page_views" name="來訪總次數" stroke="#255a8f" strokeWidth={2} type="monotone" />
              <Line dataKey="unique_visitors" name="不重複訪客" stroke="#2d7d6f" strokeWidth={2} type="monotone" />
              <Line dataKey="quiz_complete" name="完成檢測" stroke="#7b61a8" strokeWidth={2} type="monotone" />
              <Line dataKey="assessment_submit" name="送出 Email" stroke="#6a4c93" strokeWidth={2} type="monotone" />
              <Line dataKey="audio_purchase_click" name="點擊購買音頻" stroke="#a66f2d" strokeWidth={2} type="monotone" />
              <Line dataKey="line_click" name="加入 LINE" stroke="#1f8f5f" strokeWidth={2} type="monotone" />
              <Line dataKey="consultation_booking" name="預約諮詢" stroke="#8f6a25" strokeWidth={2} type="monotone" />
              <Line dataKey="payment_success" name="完成付款" stroke="#b54646" strokeWidth={2} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
