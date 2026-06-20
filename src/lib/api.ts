import type { DashboardSummary } from "../analytics/types";

export type FetchDashboardSummaryParams = {
  accessToken: string;
  from?: string;
  to?: string;
  siteId?: string;
  source?: string;
  eventName?: string;
};

const maxRangeMs = 31 * 24 * 60 * 60 * 1000;

function defaultDateRange(now = new Date()) {
  const to = now.toISOString();
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - 7);

  return {
    from: fromDate.toISOString(),
    to
  };
}

function assertValidDateRange(from: string, to: string) {
  const fromTime = Date.parse(from);
  const toTime = Date.parse(to);

  if (!Number.isFinite(fromTime) || !Number.isFinite(toTime) || fromTime > toTime || toTime - fromTime > maxRangeMs) {
    throw new Error("invalid_date_range");
  }
}

export async function fetchDashboardSummary({
  accessToken,
  from,
  to,
  siteId,
  source,
  eventName
}: FetchDashboardSummaryParams): Promise<DashboardSummary> {
  const range = defaultDateRange();
  const searchParams = new URLSearchParams({
    from: from ?? range.from,
    to: to ?? range.to
  });

  assertValidDateRange(searchParams.get("from") ?? "", searchParams.get("to") ?? "");

  if (siteId) {
    searchParams.set("site_id", siteId);
  }

  if (source) {
    searchParams.set("source", source);
  }

  if (eventName) {
    searchParams.set("event_name", eventName);
  }

  const response = await fetch(`/api/dashboard-summary?${searchParams.toString()}`, {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Dashboard summary request failed with status ${response.status}`);
  }

  return (await response.json()) as DashboardSummary;
}
