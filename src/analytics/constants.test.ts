import { describe, expect, it } from "vitest";
import { EVENT_NAMES, SITE_IDS, isKnownEventName, isKnownSiteId } from "./constants";

describe("analytics constants", () => {
  it("accepts only configured site IDs", () => {
    expect(isKnownSiteId("quantum_frequency_assessment")).toBe(true);
    expect(isKnownSiteId("timewaver_audio_sales")).toBe(true);
    expect(isKnownSiteId("unknown_site")).toBe(false);
  });

  it("accepts only configured event names", () => {
    expect(isKnownEventName("page_view")).toBe(true);
    expect(isKnownEventName("payment_success")).toBe(true);
    expect(isKnownEventName("unknown_event")).toBe(false);
  });

  it("keeps the dashboard event order stable", () => {
    expect(EVENT_NAMES).toEqual([
      "page_view",
      "assessment_submit",
      "audio_purchase_click",
      "line_click",
      "consultation_booking",
      "payment_success"
    ]);
    expect(SITE_IDS).toEqual(["quantum_frequency_assessment", "timewaver_audio_sales"]);
  });
});
