import { beforeEach, describe, expect, it, vi } from "vitest";
import dashboardSummary from "./dashboard-summary";

const getUser = vi.fn();
const order = vi.fn();
const lte = vi.fn(() => ({ order }));
const gte = vi.fn(() => ({ lte }));
const select = vi.fn(() => ({ gte }));
const from = vi.fn(() => ({ select }));
const createClient = vi.fn((url: string, key: string) => {
  if (key === "anon-key") {
    return { auth: { getUser } };
  }

  return { from };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: (url: string, key: string) => createClient(url, key)
}));

function createRequest(headers: Record<string, string> = {}, path = "/api/dashboard-summary") {
  return new Request(`https://dashboard.example.com${path}`, {
    method: "GET",
    headers
  });
}

describe("dashboard-summary function", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("DASHBOARD_ADMIN_EMAILS", "admin@example.com,ops@example.com");
    getUser.mockResolvedValue({ data: { user: { id: "admin-user", email: "admin@example.com" } }, error: null });
    order.mockResolvedValue({ data: [], error: null });
  });

  it("rejects requests without a bearer token", async () => {
    const response = await dashboardSummary(createRequest(), {} as never);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects requests when Supabase auth does not return a user", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error("bad jwt") });

    const response = await dashboardSummary(createRequest({ authorization: "Bearer bad-token" }), {} as never);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" });
    expect(getUser).toHaveBeenCalledWith("bad-token");
    expect(from).not.toHaveBeenCalled();
  });

  it("returns forbidden for authenticated users outside the admin allowlist", async () => {
    getUser.mockResolvedValueOnce({ data: { user: { id: "regular-user", email: "user@example.com" } }, error: null });

    const response = await dashboardSummary(createRequest({ authorization: "Bearer user-token" }), {} as never);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "forbidden" });
    expect(from).not.toHaveBeenCalled();
  });

  it("returns forbidden when admin allowlist is missing", async () => {
    vi.stubEnv("DASHBOARD_ADMIN_EMAILS", "");

    const response = await dashboardSummary(createRequest({ authorization: "Bearer good-token" }), {} as never);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "forbidden" });
    expect(from).not.toHaveBeenCalled();
  });

  it("allows admin emails from the allowlist to query analytics", async () => {
    getUser.mockResolvedValueOnce({ data: { user: { id: "ops-user", email: "ops@example.com" } }, error: null });

    const response = await dashboardSummary(createRequest({ authorization: "Bearer ops-token" }), {} as never);

    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledWith("analytics_events");
  });

  it("returns server_not_configured when required env vars are missing", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const response = await dashboardSummary(createRequest({ authorization: "Bearer good-token" }), {} as never);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "server_not_configured" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("queries the selected date range and returns an aggregated summary", async () => {
    order.mockResolvedValueOnce({
      data: [
        {
          site_id: "quantum_frequency_assessment",
          event_name: "page_view",
          visitor_id: "visitor-1",
          session_id: "session-1",
          page_url: "https://quantum-frequency-assessment.netlify.app/",
          referrer: null,
          utm_source: "facebook",
          utm_medium: null,
          utm_campaign: null,
          utm_content: null,
          metadata: {},
          created_at: "2026-06-19T01:00:00.000Z"
        },
        {
          site_id: "quantum_frequency_assessment",
          event_name: "payment_success",
          visitor_id: "visitor-1",
          session_id: "session-1",
          page_url: "https://quantum-frequency-assessment.netlify.app/",
          referrer: null,
          utm_source: "facebook",
          utm_medium: null,
          utm_campaign: null,
          utm_content: null,
          metadata: {},
          created_at: "2026-06-19T01:05:00.000Z"
        }
      ],
      error: null
    });

    const response = await dashboardSummary(
      createRequest(
        { authorization: "Bearer good-token" },
        "/api/dashboard-summary?from=2026-06-01T00:00:00.000Z&to=2026-06-19T23:59:59.999Z"
      ),
      {} as never
    );

    expect(response.status).toBe(200);
    expect(createClient).toHaveBeenNthCalledWith(1, "https://project.supabase.co", "anon-key");
    expect(createClient).toHaveBeenNthCalledWith(2, "https://project.supabase.co", "service-role-key");
    expect(from).toHaveBeenCalledWith("analytics_events");
    expect(select).toHaveBeenCalledWith("*");
    expect(gte).toHaveBeenCalledWith("created_at", "2026-06-01T00:00:00.000Z");
    expect(lte).toHaveBeenCalledWith("created_at", "2026-06-19T23:59:59.999Z");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: true });
    await expect(response.json()).resolves.toMatchObject({
      overview: {
        page_views: 1,
        unique_visitors: 1,
        total_conversions: 1,
        payment_success: 1,
        total_conversion_rate: 1,
        payment_conversion_rate: 1
      }
    });
  });

  it("applies site, source, and event filters before aggregation", async () => {
    order.mockResolvedValueOnce({
      data: [
        {
          site_id: "quantum_frequency_assessment",
          event_name: "assessment_submit",
          visitor_id: "visitor-1",
          session_id: "session-1",
          page_url: "https://quantum-frequency-assessment.netlify.app/",
          referrer: null,
          utm_source: "facebook",
          utm_medium: null,
          utm_campaign: null,
          utm_content: null,
          metadata: {},
          created_at: "2026-06-19T01:00:00.000Z"
        },
        {
          site_id: "timewaver_audio_sales",
          event_name: "assessment_submit",
          visitor_id: "visitor-2",
          session_id: "session-2",
          page_url: "https://timewaver-audio-sales.netlify.app/",
          referrer: null,
          utm_source: "facebook",
          utm_medium: null,
          utm_campaign: null,
          utm_content: null,
          metadata: {},
          created_at: "2026-06-19T01:01:00.000Z"
        },
        {
          site_id: "quantum_frequency_assessment",
          event_name: "payment_success",
          visitor_id: "visitor-1",
          session_id: "session-1",
          page_url: "https://quantum-frequency-assessment.netlify.app/",
          referrer: null,
          utm_source: "facebook",
          utm_medium: null,
          utm_campaign: null,
          utm_content: null,
          metadata: {},
          created_at: "2026-06-19T01:02:00.000Z"
        }
      ],
      error: null
    });

    const response = await dashboardSummary(
      createRequest(
        { authorization: "Bearer good-token" },
        "/api/dashboard-summary?from=2026-06-19T00:00:00.000Z&to=2026-06-19T23:59:59.999Z&site_id=quantum_frequency_assessment&source=facebook&event_name=assessment_submit"
      ),
      {} as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      overview: {
        total_conversions: 1,
        payment_success: 0
      },
      sites: [
        expect.objectContaining({
          site_id: "quantum_frequency_assessment",
          assessment_submit: 1
        }),
        expect.objectContaining({
          site_id: "timewaver_audio_sales",
          assessment_submit: 0
        })
      ]
    });
  });

  it("rejects unknown filter values", async () => {
    const response = await dashboardSummary(
      createRequest(
        { authorization: "Bearer good-token" },
        "/api/dashboard-summary?from=2026-06-19T00:00:00.000Z&to=2026-06-19T23:59:59.999Z&site_id=unknown_site"
      ),
      {} as never
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_filter" });
  });

  it("defaults the date range to the previous seven days through now", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T12:00:00.000Z"));

    const response = await dashboardSummary(createRequest({ authorization: "Bearer good-token" }), {} as never);

    expect(response.status).toBe(200);
    expect(gte).toHaveBeenCalledWith("created_at", "2026-06-12T12:00:00.000Z");
    expect(lte).toHaveBeenCalledWith("created_at", "2026-06-19T12:00:00.000Z");
  });

  it("rejects invalid date range params", async () => {
    const response = await dashboardSummary(
      createRequest(
        { authorization: "Bearer good-token" },
        "/api/dashboard-summary?from=not-a-date&to=2026-06-19T23:59:59.999Z"
      ),
      {} as never
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_date_range" });
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects reversed date ranges", async () => {
    const response = await dashboardSummary(
      createRequest(
        { authorization: "Bearer good-token" },
        "/api/dashboard-summary?from=2026-06-20T00:00:00.000Z&to=2026-06-19T00:00:00.000Z"
      ),
      {} as never
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_date_range" });
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects date ranges longer than 31 days", async () => {
    const response = await dashboardSummary(
      createRequest(
        { authorization: "Bearer good-token" },
        "/api/dashboard-summary?from=2026-05-01T00:00:00.000Z&to=2026-06-19T00:00:00.000Z"
      ),
      {} as never
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_date_range" });
    expect(from).not.toHaveBeenCalled();
  });

  it("returns query_failed when Supabase returns a query error", async () => {
    order.mockResolvedValueOnce({ data: null, error: new Error("query failed") });

    const response = await dashboardSummary(createRequest({ authorization: "Bearer good-token" }), {} as never);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "query_failed" });
  });
});
