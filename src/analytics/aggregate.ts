import {
  EVENT_NAMES,
  SITE_IDS,
  SITE_LABELS,
  isKnownEventName,
  isKnownSiteId,
  type EventName,
  type SiteId
} from "./constants";
import type { AnalyticsEvent, DailyTrend, DashboardSummary, HourlyTrend, SiteMetrics, SourceMetrics } from "./types";

const CONVERSION_EVENTS = EVENT_NAMES.filter((eventName) => eventName !== "page_view");

type CountableEvent = Exclude<EventName, "page_view">;

type Counts = Record<CountableEvent, number>;

function emptyCounts(): Counts {
  return {
    assessment_submit: 0,
    audio_purchase_click: 0,
    line_click: 0,
    consultation_booking: 0,
    payment_success: 0
  };
}

function incrementConversionCount(counts: Counts, eventName: EventName) {
  if (eventName !== "page_view") {
    counts[eventName] += 1;
  }
}

function rate(numerator: number, denominator: number) {
  if (denominator === 0) {
    return 0;
  }

  return Number((numerator / denominator).toFixed(4));
}

function sourceFrom(event: AnalyticsEvent) {
  const utmSource = typeof event.utm_source === "string" ? event.utm_source.trim() : "";
  if (utmSource) {
    return utmSource;
  }

  const referrer = typeof event.referrer === "string" ? event.referrer.trim() : "";
  return referrer || "direct";
}

function dateFrom(event: AnalyticsEvent) {
  return new Date(event.created_at).toISOString().slice(0, 10);
}

function hourFrom(event: AnalyticsEvent) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Asia/Taipei"
  });
  const hour = formatter.format(new Date(event.created_at)).replace(/^24$/, "00");
  return `${hour}:00`;
}

function createHourlyRows() {
  return Array.from({ length: 24 }, (_item, hour) => {
    const row = {
      hour: `${String(hour).padStart(2, "0")}:00`,
      page_views: 0,
      unique_visitors: 0,
      ...emptyCounts()
    } satisfies HourlyTrend;

    return row;
  });
}

function isValidEvent(event: AnalyticsEvent) {
  return (
    isKnownSiteId(event.site_id) &&
    isKnownEventName(event.event_name) &&
    typeof event.visitor_id === "string" &&
    event.visitor_id.trim().length > 0 &&
    typeof event.created_at === "string" &&
    !Number.isNaN(new Date(event.created_at).getTime())
  );
}

export function buildDashboardSummary(events: AnalyticsEvent[]): DashboardSummary {
  const overviewVisitors = new Set<string>();
  const siteVisitors = new Map<SiteId, Set<string>>();
  const sourceVisitors = new Map<string, Set<string>>();
  const trendVisitors = new Map<string, Set<string>>();
  const hourlyVisitors = new Map<string, Set<string>>();
  const siteRows = new Map<SiteId, SiteMetrics>();
  const sourceRows = new Map<string, SourceMetrics>();
  const trendRows = new Map<string, DailyTrend>();
  const hourlyRows = new Map<string, HourlyTrend>();

  let pageViews = 0;
  let totalConversions = 0;
  let paymentSuccess = 0;

  for (const siteId of SITE_IDS) {
    siteVisitors.set(siteId, new Set());
    siteRows.set(siteId, {
      site_id: siteId,
      site_label: SITE_LABELS[siteId],
      page_views: 0,
      unique_visitors: 0,
      ...emptyCounts(),
      payment_conversion_rate: 0
    });
  }

  for (const hourlyRow of createHourlyRows()) {
    hourlyRows.set(hourlyRow.hour, hourlyRow);
    hourlyVisitors.set(hourlyRow.hour, new Set());
  }

  for (const event of events) {
    if (!isValidEvent(event)) {
      continue;
    }

    overviewVisitors.add(event.visitor_id);

    const siteVisitorSet = siteVisitors.get(event.site_id);
    const siteRow = siteRows.get(event.site_id);
    if (siteVisitorSet && siteRow) {
      siteVisitorSet.add(event.visitor_id);
    }

    const date = dateFrom(event);
    const trendRow =
      trendRows.get(date) ??
      ({
        date,
        page_views: 0,
        unique_visitors: 0,
        ...emptyCounts()
      } satisfies DailyTrend);
    trendRows.set(date, trendRow);

    const trendVisitorSet = trendVisitors.get(date) ?? new Set<string>();
    trendVisitorSet.add(event.visitor_id);
    trendVisitors.set(date, trendVisitorSet);

    const hour = hourFrom(event);
    const hourlyRow = hourlyRows.get(hour);
    const hourlyVisitorSet = hourlyVisitors.get(hour);
    if (hourlyVisitorSet) {
      hourlyVisitorSet.add(event.visitor_id);
    }

    const source = sourceFrom(event);
    const sourceRow =
      sourceRows.get(source) ??
      ({
        source,
        page_views: 0,
        unique_visitors: 0,
        total_conversions: 0,
        payment_success: 0
      } satisfies SourceMetrics);
    sourceRows.set(source, sourceRow);

    const sourceVisitorSet = sourceVisitors.get(source) ?? new Set<string>();
    sourceVisitorSet.add(event.visitor_id);
    sourceVisitors.set(source, sourceVisitorSet);

    if (event.event_name === "page_view") {
      pageViews += 1;
      trendRow.page_views += 1;
      if (hourlyRow) {
        hourlyRow.page_views += 1;
      }
      sourceRow.page_views += 1;
      if (siteRow) {
        siteRow.page_views += 1;
      }
    } else {
      totalConversions += 1;
      incrementConversionCount(trendRow, event.event_name);
      if (hourlyRow) {
        incrementConversionCount(hourlyRow, event.event_name);
      }
      sourceRow.total_conversions += 1;
      if (siteRow) {
        incrementConversionCount(siteRow, event.event_name);
      }
    }

    if (event.event_name === "payment_success") {
      paymentSuccess += 1;
      sourceRow.payment_success += 1;
    }
  }

  const sites = SITE_IDS.map((siteId) => {
    const siteRow = siteRows.get(siteId);
    const uniqueVisitors = siteVisitors.get(siteId)?.size ?? 0;

    return {
      ...(siteRow as SiteMetrics),
      unique_visitors: uniqueVisitors,
      payment_conversion_rate: rate(siteRow?.payment_success ?? 0, uniqueVisitors)
    };
  });

  const trends = Array.from(trendRows.values())
    .map((trendRow) => ({
      ...trendRow,
      unique_visitors: trendVisitors.get(trendRow.date)?.size ?? 0
    }))
    .sort((left, right) => left.date.localeCompare(right.date));

  const sources = Array.from(sourceRows.values())
    .map((sourceRow) => ({
      ...sourceRow,
      unique_visitors: sourceVisitors.get(sourceRow.source)?.size ?? 0
    }))
    .sort((left, right) => {
      const conversionDifference = right.total_conversions - left.total_conversions;
      if (conversionDifference !== 0) {
        return conversionDifference;
      }

      const paymentDifference = right.payment_success - left.payment_success;
      if (paymentDifference !== 0) {
        return paymentDifference;
      }

      const pageViewDifference = right.page_views - left.page_views;
      if (pageViewDifference !== 0) {
        return pageViewDifference;
      }

      return left.source.localeCompare(right.source);
    });

  return {
    overview: {
      page_views: pageViews,
      unique_visitors: overviewVisitors.size,
      total_conversions: totalConversions,
      payment_success: paymentSuccess,
      total_conversion_rate: rate(totalConversions, overviewVisitors.size),
      payment_conversion_rate: rate(paymentSuccess, overviewVisitors.size)
    },
    sites,
    trends,
    hourly_trends: Array.from(hourlyRows.values()).map((hourlyRow) => ({
      ...hourlyRow,
      unique_visitors: hourlyVisitors.get(hourlyRow.hour)?.size ?? 0
    })),
    sources
  };
}

export { CONVERSION_EVENTS };
