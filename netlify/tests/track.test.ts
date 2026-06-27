import { beforeEach, describe, expect, it, vi } from "vitest";
import track from "../functions/track";

const insert = vi.fn();
const from = vi.fn(() => ({ insert }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from }))
}));

function createRequest(method: string, body?: unknown, origin = "https://quantum-frequency-assessment.netlify.app") {
  return new Request("https://dashboard.example.com/api/track", {
    method,
    headers: {
      "content-type": "application/json",
      origin
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

function createRequestWithoutOrigin(method: string, body?: unknown) {
  return new Request("https://dashboard.example.com/api/track", {
    method,
    headers: {
      "content-type": "application/json"
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

const validPayload = {
  site_id: "quantum_frequency_assessment",
  event_name: "assessment_submit",
  visitor_id: "visitor-1",
  session_id: "session-1",
  page_url: "https://quantum-frequency-assessment.netlify.app/",
  referrer: "https://facebook.com/",
  utm_source: "facebook",
  utm_medium: "social",
  utm_campaign: "sleep-audio",
  utm_content: "card-a",
  metadata: { form: "main-assessment" }
};

describe("track function", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv(
      "TRACKING_ALLOWED_ORIGINS",
      "https://quantum-frequency-assessment.netlify.app,https://timewaver-audio-sales.netlify.app"
    );
    insert.mockResolvedValue({ error: null });
  });

  it("allows OPTIONS preflight with CORS headers", async () => {
    const response = await track(createRequest("OPTIONS"), {} as never);

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://quantum-frequency-assessment.netlify.app"
    );
    expect(response.headers.get("access-control-allow-methods")).toBe("POST, OPTIONS");
  });

  it("rejects non-POST requests", async () => {
    const response = await track(createRequest("GET"), {} as never);

    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toEqual({ error: "method_not_allowed" });
  });

  it("rejects unknown site IDs", async () => {
    const response = await track(createRequest("POST", { ...validPayload, site_id: "unknown_site" }), {} as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_event" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("inserts valid events into Supabase", async () => {
    const response = await track(createRequest("POST", validPayload), {} as never);

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(from).toHaveBeenCalledWith("analytics_events");
    expect(insert).toHaveBeenCalledWith({
      site_id: "quantum_frequency_assessment",
      event_name: "assessment_submit",
      visitor_id: "visitor-1",
      session_id: "session-1",
      page_url: "https://quantum-frequency-assessment.netlify.app/",
      referrer: "https://facebook.com/",
      utm_source: "facebook",
      utm_medium: "social",
      utm_campaign: "sleep-audio",
      utm_content: "card-a",
      metadata: { form: "main-assessment" }
    });
  });

  it("accepts quiz completion events from the assessment page", async () => {
    const response = await track(
      createRequest("POST", {
        ...validPayload,
        event_name: "quiz_complete",
        metadata: { result_type: "A" }
      }),
      {} as never
    );

    expect(response.status).toBe(202);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: "quiz_complete",
        metadata: { result_type: "A" }
      })
    );
  });

  it("rejects invalid JSON", async () => {
    const response = await track(
      new Request("https://dashboard.example.com/api/track", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://quantum-frequency-assessment.netlify.app"
        },
        body: "{"
      }),
      {} as never
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_json" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects missing required fields", async () => {
    const response = await track(
      createRequest("POST", {
        site_id: "quantum_frequency_assessment",
        event_name: "page_view",
        visitor_id: "visitor-1"
      }),
      {} as never
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_event" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects origins outside the allow list", async () => {
    const response = await track(createRequest("POST", validPayload, "https://not-allowed.example.com"), {} as never);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "origin_not_allowed" });
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("rejects browser-origin requests when allowed origins are empty", async () => {
    vi.stubEnv("TRACKING_ALLOWED_ORIGINS", "");

    const response = await track(createRequest("POST", validPayload), {} as never);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "origin_not_allowed" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects browser-origin requests when allowed origins are missing", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");

    const response = await track(createRequest("POST", validPayload), {} as never);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "origin_not_allowed" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects POST requests without an origin when allowed origins are configured", async () => {
    const response = await track(createRequestWithoutOrigin("POST", validPayload), {} as never);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "origin_not_allowed" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects POST requests without an origin when allowed origins are empty", async () => {
    vi.stubEnv("TRACKING_ALLOWED_ORIGINS", "");

    const response = await track(createRequestWithoutOrigin("POST", validPayload), {} as never);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "origin_not_allowed" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects POST requests without an origin when allowed origins are missing", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");

    const response = await track(createRequestWithoutOrigin("POST", validPayload), {} as never);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "origin_not_allowed" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects OPTIONS requests without an origin", async () => {
    const response = await track(createRequestWithoutOrigin("OPTIONS"), {} as never);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "origin_not_allowed" });
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("rejects allowed origins submitting events for the other site ID", async () => {
    const response = await track(
      createRequest("POST", { ...validPayload, site_id: "timewaver_audio_sales" }),
      {} as never
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_event" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects page URLs from another tracked site host", async () => {
    const response = await track(
      createRequest("POST", {
        ...validPayload,
        page_url: "https://timewaver-audio-sales.netlify.app/checkout"
      }),
      {} as never
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_event" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns server_not_configured when Supabase env is missing", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const response = await track(createRequest("POST", validPayload), {} as never);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "server_not_configured" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns insert_failed when Supabase rejects the insert", async () => {
    insert.mockResolvedValueOnce({ error: new Error("insert failed") });

    const response = await track(createRequest("POST", validPayload), {} as never);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "insert_failed" });
  });

  it("rejects unknown event names", async () => {
    const response = await track(createRequest("POST", { ...validPayload, event_name: "unknown_event" }), {} as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_event" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("normalizes metadata arrays to an empty object", async () => {
    const response = await track(createRequest("POST", { ...validPayload, metadata: ["main-assessment"] }), {} as never);

    expect(response.status).toBe(202);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ metadata: {} }));
  });

  it("normalizes metadata primitives to an empty object", async () => {
    const response = await track(createRequest("POST", { ...validPayload, metadata: "main-assessment" }), {} as never);

    expect(response.status).toBe(202);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ metadata: {} }));
  });

  it("filters private metadata keys server-side", async () => {
    const response = await track(
      createRequest("POST", {
        ...validPayload,
        metadata: {
          label: "main-form",
          amount: 1880,
          emailAddress: "customer@example.com",
          phoneNumber: "0912345678",
          fullName: "Private Name",
          cardNumber: "4111111111111111",
          private_answers: "sensitive",
          authToken: "token",
          api_secret: "secret",
          addressLine1: "private address",
          dateOfBirth: "1990-01-01",
          passportNumber: "private-passport",
          national_id: "private-id",
          nested: { answer: "not-flat" }
        }
      }),
      {} as never
    );

    expect(response.status).toBe(202);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          label: "main-form",
          amount: 1880
        }
      })
    );
  });
});
