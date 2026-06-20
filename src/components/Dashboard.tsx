import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { EVENT_LABELS, EVENT_NAMES, SITE_IDS, SITE_LABELS } from "../analytics/constants";
import { demoDashboardSummary } from "../analytics/demoSummary";
import type { DashboardSummary } from "../analytics/types";
import { fetchDashboardSummary } from "../lib/api";
import FunnelPanel from "./FunnelPanel";
import MetricCard from "./MetricCard";
import SiteComparisonTable from "./SiteComparisonTable";
import SourceTable from "./SourceTable";
import TrendChart from "./TrendChart";

type DashboardProps = {
  demoMode?: boolean;
  session?: Session;
};

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function initialFromDate() {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return dateInputValue(date);
}

function toStartIso(date: string) {
  return new Date(`${date}T00:00:00+08:00`).toISOString();
}

function toEndIso(date: string) {
  return new Date(`${date}T23:59:59.999+08:00`).toISOString();
}

export default function Dashboard({ demoMode = false, session }: DashboardProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(() => dateInputValue(new Date()));
  const [siteId, setSiteId] = useState("");
  const [source, setSource] = useState("");
  const [eventName, setEventName] = useState("");

  useEffect(() => {
    if (demoMode) {
      setSummary(demoDashboardSummary);
      setIsLoading(false);
      setError("");
      return;
    }

    if (!session) {
      setError("尚未登入，無法載入檢控資料。");
      setIsLoading(false);
      return;
    }

    const accessToken = session.access_token;
    let isActive = true;

    async function loadSummary() {
      setIsLoading(true);
      setError("");

      try {
        const nextSummary = await fetchDashboardSummary({
          accessToken,
          from: toStartIso(fromDate),
          to: toEndIso(toDate),
          siteId,
          source,
          eventName
        });

        if (isActive) {
          setSummary(nextSummary);
        }
      } catch {
        if (isActive) {
          setError("無法載入檢控資料，請稍後再試。");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      isActive = false;
    };
  }, [demoMode, eventName, fromDate, session, siteId, source, toDate]);

  const sourceOptions = Array.from(new Set([source, ...(summary?.sources.map((item) => item.source) ?? [])])).filter(Boolean);

  return (
    <main className="app-shell">
      <header className="dashboard-header">
        <div>
          <h1>ABL 檢控面板</h1>
          <p>最近 7 天流量與轉換總覽</p>
        </div>
      </header>

      <section className="filter-bar" aria-label="篩選條件">
        <label>
          <span>開始日期</span>
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        </label>
        <label>
          <span>結束日期</span>
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </label>
        <label>
          <span>網站</span>
          <select value={siteId} onChange={(event) => setSiteId(event.target.value)}>
            <option value="">全部網站</option>
            {SITE_IDS.map((id) => (
              <option key={id} value={id}>
                {SITE_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>來源</span>
          <select value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="">全部來源</option>
            {sourceOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>事件</span>
          <select value={eventName} onChange={(event) => setEventName(event.target.value)}>
            <option value="">全部事件</option>
            {EVENT_NAMES.map((name) => (
              <option key={name} value={name}>
                {EVENT_LABELS[name]}
              </option>
            ))}
          </select>
        </label>
      </section>

      {isLoading ? <p className="status-message">正在載入檢控資料。</p> : null}
      {error ? <p className="status-message error-message">{error}</p> : null}

      {summary ? (
        <>
          <section className="metrics-grid" aria-label="總覽指標">
            <MetricCard
              detail={`總轉換率 ${percent(summary.overview.total_conversion_rate)}`}
              label="來訪總次數"
              value={summary.overview.page_views}
            />
            <MetricCard
              detail={`付款轉換率 ${percent(summary.overview.payment_conversion_rate)}`}
              label="不重複訪客"
              value={summary.overview.unique_visitors}
            />
            <MetricCard label="總轉換次數" value={summary.overview.total_conversions} />
            <MetricCard label="完成付款" value={summary.overview.payment_success} />
          </section>
          <SiteComparisonTable sites={summary.sites} crossSiteUniqueVisitors={summary.overview.unique_visitors} />
          <div className="dashboard-grid">
            <FunnelPanel summary={summary} />
            <SourceTable sources={summary.sources} />
          </div>
          <TrendChart trends={summary.trends} />
        </>
      ) : null}
    </main>
  );
}
