export const SITE_IDS = ["quantum_frequency_assessment", "timewaver_audio_sales"] as const;

export const EVENT_NAMES = [
  "page_view",
  "quiz_start",
  "quiz_complete",
  "lead_form_view",
  "assessment_submit",
  "result_view",
  "audio_purchase_click",
  "recommended_audio_click",
  "line_click",
  "consultation_booking",
  "payment_success"
] as const;

export const SITE_LABELS: Record<SiteId, string> = {
  quantum_frequency_assessment: "Quantum Frequency Assessment",
  timewaver_audio_sales: "TimeWaver Audio Sales"
};

export const EVENT_LABELS: Record<EventName, string> = {
  page_view: "來訪總次數",
  quiz_start: "開始檢測",
  quiz_complete: "完成檢測",
  lead_form_view: "看到留資表單",
  assessment_submit: "送出 Email",
  result_view: "查看完整結果",
  audio_purchase_click: "點擊購買音頻",
  recommended_audio_click: "點擊推薦音頻",
  line_click: "加入 LINE",
  consultation_booking: "預約諮詢",
  payment_success: "完成付款"
};

export type SiteId = (typeof SITE_IDS)[number];
export type EventName = (typeof EVENT_NAMES)[number];

export function isKnownSiteId(value: string): value is SiteId {
  return SITE_IDS.includes(value as SiteId);
}

export function isKnownEventName(value: string): value is EventName {
  return EVENT_NAMES.includes(value as EventName);
}
