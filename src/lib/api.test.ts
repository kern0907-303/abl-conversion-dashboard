import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDashboardSummary } from "./api";
import type { DashboardSummary } from "../analytics/types";

const emptySummary: DashboardSummary = {
  overview: {
    page_views: 0,
    unique_visitors: 0,
    total_conversions: 0,
    payment_success: 0,
    total_conversion_rate: 0,
    payment_conversion_rate: 0
  },
  sites: [],
  trends: [],
  sources: []
};

describe("fetchDashboardSummary", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(emptySummary)
      })
    );
  });

  it("sends bearer auth and requested date range", async () => {
    await fetchDashboardSummary({
      accessToken: "admin-token",
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-08T00:00:00.000Z"
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/dashboard-summary?from=2026-06-01T00%3A00%3A00.000Z&to=2026-06-08T00%3A00%3A00.000Z",
      {
        headers: {
          authorization: "Bearer admin-token"
        }
      }
    );
  });

  it("sends optional dashboard filters", async () => {
    await fetchDashboardSummary({
      accessToken: "admin-token",
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-08T00:00:00.000Z",
      siteId: "quantum_frequency_assessment",
      source: "facebook",
      eventName: "assessment_submit"
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/dashboard-summary?from=2026-06-01T00%3A00%3A00.000Z&to=2026-06-08T00%3A00%3A00.000Z&site_id=quantum_frequency_assessment&source=facebook&event_name=assessment_submit",
      {
        headers: {
          authorization: "Bearer admin-token"
        }
      }
    );
  });

  it("rejects invalid date ranges before calling the API", async () => {
    await expect(
      fetchDashboardSummary({
        accessToken: "admin-token",
        from: "not-a-date",
        to: "2026-06-08T00:00:00.000Z"
      })
    ).rejects.toThrow("invalid_date_range");

    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects reversed date ranges before calling the API", async () => {
    await expect(
      fetchDashboardSummary({
        accessToken: "admin-token",
        from: "2026-06-09T00:00:00.000Z",
        to: "2026-06-08T00:00:00.000Z"
      })
    ).rejects.toThrow("invalid_date_range");

    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects date ranges longer than 31 days before calling the API", async () => {
    await expect(
      fetchDashboardSummary({
        accessToken: "admin-token",
        from: "2026-06-01T00:00:00.000Z",
        to: "2026-07-03T00:00:00.000Z"
      })
    ).rejects.toThrow("invalid_date_range");

    expect(fetch).not.toHaveBeenCalled();
  });
});
