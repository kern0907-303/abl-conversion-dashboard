import type { EventName, SiteId } from "./constants";

export type CountableEventName = Exclude<EventName, "page_view">;
export type EventCounts = Record<CountableEventName, number>;

export type AnalyticsEvent = {
  id?: string;
  site_id: SiteId;
  event_name: EventName;
  visitor_id: string;
  session_id: string;
  page_url: string;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
};

export type DateRange = {
  from: string;
  to: string;
};

export type SiteMetrics = EventCounts & {
  site_id: SiteId;
  site_label: string;
  page_views: number;
  unique_visitors: number;
  payment_conversion_rate: number;
};

export type OverviewMetrics = {
  page_views: number;
  unique_visitors: number;
  total_conversions: number;
  payment_success: number;
  total_conversion_rate: number;
  payment_conversion_rate: number;
};

export type DailyTrend = EventCounts & {
  date: string;
  page_views: number;
  unique_visitors: number;
};

export type HourlyTrend = EventCounts & {
  hour: string;
  page_views: number;
  unique_visitors: number;
};

export type SourceMetrics = {
  source: string;
  page_views: number;
  unique_visitors: number;
  total_conversions: number;
  payment_success: number;
};

export type DashboardSummary = {
  overview: OverviewMetrics;
  sites: SiteMetrics[];
  trends: DailyTrend[];
  hourly_trends: HourlyTrend[];
  sources: SourceMetrics[];
};
