import { describe, expect, it } from "vitest";
import type { AnalyticsEvent } from "./types";
import { buildDashboardSummary } from "./aggregate";

const baseEvent = {
  site_id: "quantum_frequency_assessment",
  visitor_id: "visitor-1",
  session_id: "session-1",
  page_url: "https://quantum-frequency-assessment.netlify.app/",
  referrer: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  metadata: {}
} satisfies Omit<AnalyticsEvent, "event_name" | "created_at">;

function event(overrides: Partial<AnalyticsEvent> & Pick<AnalyticsEvent, "event_name" | "created_at">): AnalyticsEvent {
  return {
    ...baseEvent,
    ...overrides
  };
}

describe("buildDashboardSummary", () => {
  it("returns safe empty metrics with one row per configured site", () => {
    expect(buildDashboardSummary([])).toEqual({
      overview: {
        page_views: 0,
        unique_visitors: 0,
        total_conversions: 0,
        payment_success: 0,
        total_conversion_rate: 0,
        payment_conversion_rate: 0
      },
      sites: [
        {
          site_id: "quantum_frequency_assessment",
          site_label: "Quantum Frequency Assessment",
          page_views: 0,
          unique_visitors: 0,
          assessment_submit: 0,
          audio_purchase_click: 0,
          line_click: 0,
          consultation_booking: 0,
          payment_success: 0,
          payment_conversion_rate: 0
        },
        {
          site_id: "timewaver_audio_sales",
          site_label: "TimeWaver Audio Sales",
          page_views: 0,
          unique_visitors: 0,
          assessment_submit: 0,
          audio_purchase_click: 0,
          line_click: 0,
          consultation_booking: 0,
          payment_success: 0,
          payment_conversion_rate: 0
        }
      ],
      trends: [],
      sources: []
    });
  });

  it("aggregates overview, site rows, trends, and sources from analytics events", () => {
    const summary = buildDashboardSummary([
      event({
        event_name: "payment_success",
        created_at: "2026-06-18T10:00:00.000Z",
        visitor_id: "visitor-2",
        utm_source: "facebook"
      }),
      event({
        event_name: "page_view",
        created_at: "2026-06-17T09:00:00.000Z",
        visitor_id: "visitor-1",
        utm_source: "facebook"
      }),
      event({
        event_name: "assessment_submit",
        created_at: "2026-06-17T09:05:00.000Z",
        visitor_id: "visitor-1",
        utm_source: "facebook"
      }),
      event({
        event_name: "page_view",
        created_at: "2026-06-17T11:00:00.000Z",
        visitor_id: "visitor-2",
        referrer: "https://line.me/"
      }),
      event({
        event_name: "line_click",
        created_at: "2026-06-18T11:00:00.000Z",
        visitor_id: "visitor-3",
        referrer: "https://line.me/"
      }),
      event({
        event_name: "page_view",
        created_at: "2026-06-18T12:00:00.000Z",
        site_id: "timewaver_audio_sales",
        page_url: "https://timewaver-audio-sales.netlify.app/",
        visitor_id: "visitor-1"
      }),
      event({
        event_name: "audio_purchase_click",
        created_at: "2026-06-18T12:05:00.000Z",
        site_id: "timewaver_audio_sales",
        page_url: "https://timewaver-audio-sales.netlify.app/",
        visitor_id: "visitor-1"
      }),
      event({
        event_name: "consultation_booking",
        created_at: "2026-06-18T12:10:00.000Z",
        site_id: "timewaver_audio_sales",
        page_url: "https://timewaver-audio-sales.netlify.app/",
        visitor_id: "visitor-4"
      })
    ]);

    expect(summary.overview).toEqual({
      page_views: 3,
      unique_visitors: 4,
      total_conversions: 5,
      payment_success: 1,
      total_conversion_rate: 1.25,
      payment_conversion_rate: 0.25
    });

    expect(summary.sites).toEqual([
      {
        site_id: "quantum_frequency_assessment",
        site_label: "Quantum Frequency Assessment",
        page_views: 2,
        unique_visitors: 3,
        assessment_submit: 1,
        audio_purchase_click: 0,
        line_click: 1,
        consultation_booking: 0,
        payment_success: 1,
        payment_conversion_rate: 0.3333
      },
      {
        site_id: "timewaver_audio_sales",
        site_label: "TimeWaver Audio Sales",
        page_views: 1,
        unique_visitors: 2,
        assessment_submit: 0,
        audio_purchase_click: 1,
        line_click: 0,
        consultation_booking: 1,
        payment_success: 0,
        payment_conversion_rate: 0
      }
    ]);

    expect(summary.trends).toEqual([
      {
        date: "2026-06-17",
        page_views: 2,
        unique_visitors: 2,
        assessment_submit: 1,
        audio_purchase_click: 0,
        line_click: 0,
        consultation_booking: 0,
        payment_success: 0
      },
      {
        date: "2026-06-18",
        page_views: 1,
        unique_visitors: 4,
        assessment_submit: 0,
        audio_purchase_click: 1,
        line_click: 1,
        consultation_booking: 1,
        payment_success: 1
      }
    ]);

    expect(summary.sources).toEqual([
      {
        source: "facebook",
        page_views: 1,
        unique_visitors: 2,
        total_conversions: 2,
        payment_success: 1
      },
      {
        source: "direct",
        page_views: 1,
        unique_visitors: 2,
        total_conversions: 2,
        payment_success: 0
      },
      {
        source: "https://line.me/",
        page_views: 1,
        unique_visitors: 2,
        total_conversions: 1,
        payment_success: 0
      }
    ]);
  });

  it("uses direct for blank source fields and rounds repeating decimal rates to four places", () => {
    const summary = buildDashboardSummary([
      event({ event_name: "page_view", created_at: "2026-06-19T00:00:00.000Z", visitor_id: "visitor-1" }),
      event({ event_name: "page_view", created_at: "2026-06-19T01:00:00.000Z", visitor_id: "visitor-2" }),
      event({ event_name: "page_view", created_at: "2026-06-19T02:00:00.000Z", visitor_id: "visitor-3" }),
      event({
        event_name: "payment_success",
        created_at: "2026-06-19T03:00:00.000Z",
        visitor_id: "visitor-1",
        utm_source: "   ",
        referrer: ""
      })
    ]);

    expect(summary.overview.payment_conversion_rate).toBe(0.3333);
    expect(summary.sources).toEqual([
      {
        source: "direct",
        page_views: 3,
        unique_visitors: 3,
        total_conversions: 1,
        payment_success: 1
      }
    ]);
  });

  it("skips malformed rows without counting unknown events as conversions", () => {
    const summary = buildDashboardSummary([
      event({ event_name: "page_view", created_at: "2026-06-19T00:00:00.000Z", visitor_id: "visitor-1" }),
      event({ event_name: "payment_success", created_at: "2026-06-19T01:00:00.000Z", visitor_id: "visitor-1" }),
      {
        ...baseEvent,
        event_name: "mystery_conversion",
        created_at: "2026-06-19T02:00:00.000Z",
        visitor_id: "visitor-2"
      },
      {
        ...baseEvent,
        site_id: "unknown_site",
        event_name: "page_view",
        created_at: "2026-06-19T03:00:00.000Z",
        visitor_id: "visitor-3"
      },
      {
        ...baseEvent,
        event_name: "page_view",
        created_at: "not-a-date",
        visitor_id: "visitor-4"
      },
      {
        ...baseEvent,
        event_name: "page_view",
        created_at: "2026-06-19T04:00:00.000Z",
        visitor_id: ""
      }
    ] as AnalyticsEvent[]);

    expect(summary.overview).toEqual({
      page_views: 1,
      unique_visitors: 1,
      total_conversions: 1,
      payment_success: 1,
      total_conversion_rate: 1,
      payment_conversion_rate: 1
    });
    expect(summary.sites[0]).toMatchObject({
      page_views: 1,
      unique_visitors: 1,
      payment_success: 1,
      payment_conversion_rate: 1
    });
    expect(summary.trends).toEqual([
      {
        date: "2026-06-19",
        page_views: 1,
        unique_visitors: 1,
        assessment_submit: 0,
        audio_purchase_click: 0,
        line_click: 0,
        consultation_booking: 0,
        payment_success: 1
      }
    ]);
    expect(summary.sources).toEqual([
      {
        source: "direct",
        page_views: 1,
        unique_visitors: 1,
        total_conversions: 1,
        payment_success: 1
      }
    ]);
  });
});
