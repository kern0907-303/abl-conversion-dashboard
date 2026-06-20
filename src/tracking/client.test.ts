import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTracker } from "./client";

const endpoint = "https://abl-dashboard.netlify.app/api/track";
const siteId = "quantum_frequency_assessment";

function latestPayload() {
  const calls = vi.mocked(fetch).mock.calls;
  const body = calls[calls.length - 1]?.[1]?.body;
  return JSON.parse(String(body)) as Record<string, unknown>;
}

describe("createTracker", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 202 })));
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState(
      {},
      "",
      "/landing?utm_source=facebook&utm_medium=cpc&utm_campaign=summer&utm_content=theta"
    );
  });

  it("sends page_view with visitor and session IDs plus UTM params", async () => {
    Object.defineProperty(document, "referrer", {
      configurable: true,
      value: "https://facebook.com/ad"
    });

    const tracker = createTracker({ siteId, endpoint });

    await tracker.pageView();

    expect(fetch).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
        keepalive: true
      })
    );

    expect(latestPayload()).toMatchObject({
      site_id: siteId,
      event_name: "page_view",
      visitor_id: tracker.getVisitorId(),
      session_id: expect.any(String),
      page_url: window.location.href,
      referrer: "https://facebook.com/ad",
      utm_source: "facebook",
      utm_medium: "cpc",
      utm_campaign: "summer",
      utm_content: "theta",
      metadata: {}
    });
  });

  it("keeps the same visitor ID across tracker instances", () => {
    const first = createTracker({ siteId, endpoint: "/api/track" });
    const second = createTracker({ siteId, endpoint: "/api/track" });

    expect(second.getVisitorId()).toBe(first.getVisitorId());
    expect(localStorage.getItem("abl_visitor_id")).toBe(first.getVisitorId());
  });

  it("keeps the same session ID within sessionStorage", async () => {
    const first = createTracker({ siteId, endpoint });
    await first.track("line_click", { label: "line-consultation" });
    const firstSessionId = latestPayload().session_id;

    const second = createTracker({ siteId, endpoint });
    await second.track("consultation_booking", { form: "consultation" });

    expect(latestPayload().session_id).toBe(firstSessionId);
    expect(sessionStorage.getItem("abl_session_id")).toBe(firstSessionId);
  });

  it("swallows fetch failures", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network down"));
    const tracker = createTracker({ siteId, endpoint });

    await expect(tracker.track("assessment_submit", { form: "main-assessment" })).resolves.toBeUndefined();
  });

  it("normalizes non-object metadata to an empty object", async () => {
    const tracker = createTracker({ siteId, endpoint });

    await tracker.track("assessment_submit", ["private", "answers"]);

    expect(latestPayload().metadata).toEqual({});
  });

  it("drops common private metadata keys including camelCase", async () => {
    const tracker = createTracker({ siteId, endpoint });

    await tracker.track("assessment_submit", {
      label: "main-form",
      amount: 1880,
      emailAddress: "customer@example.com",
      phoneNumber: "0912345678",
      fullName: "Private Name",
      cardNumber: "4111111111111111",
      private_answers: "sensitive"
    });

    expect(latestPayload().metadata).toEqual({
      label: "main-form",
      amount: 1880
    });
  });

  it("drops credential and identity metadata keys", async () => {
    const tracker = createTracker({ siteId, endpoint });

    await tracker.track("line_click", {
      label: "footer-line",
      password: "secret",
      authToken: "token",
      api_secret: "secret",
      addressLine1: "private address",
      dateOfBirth: "1990-01-01",
      passportNumber: "private-passport",
      national_id: "private-id"
    });

    expect(latestPayload().metadata).toEqual({
      label: "footer-line"
    });
  });
});
