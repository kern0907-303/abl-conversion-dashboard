import type { DashboardSummary } from "./types";

function demoHourlyTrends() {
  const activeHours = new Map([
    ["09:00", { page_views: 72, unique_visitors: 48, assessment_submit: 7, audio_purchase_click: 4, line_click: 3, consultation_booking: 1, payment_success: 1 }],
    ["12:00", { page_views: 88, unique_visitors: 53, assessment_submit: 9, audio_purchase_click: 6, line_click: 4, consultation_booking: 2, payment_success: 2 }],
    ["15:00", { page_views: 104, unique_visitors: 61, assessment_submit: 11, audio_purchase_click: 8, line_click: 5, consultation_booking: 2, payment_success: 3 }],
    ["20:00", { page_views: 156, unique_visitors: 92, assessment_submit: 14, audio_purchase_click: 18, line_click: 9, consultation_booking: 3, payment_success: 5 }],
    ["22:00", { page_views: 132, unique_visitors: 78, assessment_submit: 10, audio_purchase_click: 15, line_click: 8, consultation_booking: 2, payment_success: 4 }]
  ]);

  return Array.from({ length: 24 }, (_item, hour) => {
    const label = `${String(hour).padStart(2, "0")}:00`;
    return {
      hour: label,
      page_views: 0,
      unique_visitors: 0,
      assessment_submit: 0,
      audio_purchase_click: 0,
      line_click: 0,
      consultation_booking: 0,
      payment_success: 0,
      ...activeHours.get(label)
    };
  });
}

export const demoDashboardSummary: DashboardSummary = {
  overview: {
    page_views: 1248,
    unique_visitors: 736,
    total_conversions: 214,
    payment_success: 37,
    total_conversion_rate: 0.291,
    payment_conversion_rate: 0.05
  },
  sites: [
    {
      site_id: "quantum_frequency_assessment",
      site_label: "Quantum Frequency Assessment",
      page_views: 782,
      unique_visitors: 468,
      assessment_submit: 96,
      audio_purchase_click: 42,
      line_click: 31,
      consultation_booking: 18,
      payment_success: 11,
      payment_conversion_rate: 0.024
    },
    {
      site_id: "timewaver_audio_sales",
      site_label: "TimeWaver Audio Sales",
      page_views: 466,
      unique_visitors: 298,
      assessment_submit: 8,
      audio_purchase_click: 83,
      line_click: 29,
      consultation_booking: 9,
      payment_success: 26,
      payment_conversion_rate: 0.087
    }
  ],
  trends: [
    {
      date: "2026-06-14",
      page_views: 132,
      unique_visitors: 82,
      assessment_submit: 12,
      audio_purchase_click: 11,
      line_click: 6,
      consultation_booking: 3,
      payment_success: 4
    },
    {
      date: "2026-06-15",
      page_views: 148,
      unique_visitors: 89,
      assessment_submit: 15,
      audio_purchase_click: 14,
      line_click: 8,
      consultation_booking: 4,
      payment_success: 5
    },
    {
      date: "2026-06-16",
      page_views: 176,
      unique_visitors: 103,
      assessment_submit: 17,
      audio_purchase_click: 16,
      line_click: 7,
      consultation_booking: 3,
      payment_success: 5
    },
    {
      date: "2026-06-17",
      page_views: 184,
      unique_visitors: 111,
      assessment_submit: 18,
      audio_purchase_click: 17,
      line_click: 9,
      consultation_booking: 4,
      payment_success: 6
    },
    {
      date: "2026-06-18",
      page_views: 206,
      unique_visitors: 121,
      assessment_submit: 19,
      audio_purchase_click: 19,
      line_click: 10,
      consultation_booking: 4,
      payment_success: 6
    },
    {
      date: "2026-06-19",
      page_views: 193,
      unique_visitors: 113,
      assessment_submit: 15,
      audio_purchase_click: 23,
      line_click: 9,
      consultation_booking: 4,
      payment_success: 5
    },
    {
      date: "2026-06-20",
      page_views: 209,
      unique_visitors: 117,
      assessment_submit: 8,
      audio_purchase_click: 25,
      line_click: 11,
      consultation_booking: 5,
      payment_success: 6
    }
  ],
  hourly_trends: demoHourlyTrends(),
  sources: [
    {
      source: "facebook",
      page_views: 612,
      unique_visitors: 382,
      total_conversions: 121,
      payment_success: 22
    },
    {
      source: "line",
      page_views: 274,
      unique_visitors: 156,
      total_conversions: 48,
      payment_success: 9
    },
    {
      source: "direct",
      page_views: 215,
      unique_visitors: 128,
      total_conversions: 26,
      payment_success: 4
    },
    {
      source: "google",
      page_views: 147,
      unique_visitors: 93,
      total_conversions: 19,
      payment_success: 2
    }
  ]
};
