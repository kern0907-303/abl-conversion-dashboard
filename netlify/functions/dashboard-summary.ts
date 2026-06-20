import type { Config, Context } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { isKnownEventName, isKnownSiteId } from "../../src/analytics/constants";
import { buildDashboardSummary } from "../../src/analytics/aggregate";
import type { AnalyticsEvent } from "../../src/analytics/types";

const MAX_RANGE_MS = 31 * 24 * 60 * 60 * 1000;

type RuntimeEnv = {
  Netlify?: {
    env?: {
      get(name: string): string | undefined;
    };
  };
  process?: {
    env?: Record<string, string | undefined>;
  };
};

function getEnv(name: string): string | undefined {
  const runtime = globalThis as RuntimeEnv;
  return runtime.Netlify?.env?.get(name) ?? runtime.process?.env?.[name];
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}

function bearerToken(req: Request) {
  const authorization = req.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

function defaultDateRange(now = new Date()) {
  const to = now.toISOString();
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - 7);

  return {
    from: fromDate.toISOString(),
    to
  };
}

function adminEmails() {
  return (getEnv("DASHBOARD_ADMIN_EMAILS") ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminEmail(email: string | undefined) {
  if (!email) {
    return false;
  }

  const allowedEmails = adminEmails();
  return allowedEmails.length > 0 && allowedEmails.includes(email.trim().toLowerCase());
}

function parseDateParam(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function dateRangeFrom(req: Request) {
  const requestUrl = new URL(req.url);
  const fallbackRange = defaultDateRange();
  const rawFrom = requestUrl.searchParams.get("from") || fallbackRange.from;
  const rawTo = requestUrl.searchParams.get("to") || fallbackRange.to;
  const from = parseDateParam(rawFrom);
  const to = parseDateParam(rawTo);

  if (!from || !to || from.getTime() > to.getTime() || to.getTime() - from.getTime() > MAX_RANGE_MS) {
    return null;
  }

  return {
    from: rawFrom,
    to: rawTo
  };
}

function sourceFrom(event: AnalyticsEvent) {
  const utmSource = event.utm_source?.trim();
  if (utmSource) {
    return utmSource;
  }

  const referrer = event.referrer?.trim();
  return referrer || "direct";
}

function filteredEvents(req: Request, events: AnalyticsEvent[]) {
  const requestUrl = new URL(req.url);
  const siteId = requestUrl.searchParams.get("site_id") ?? "";
  const eventName = requestUrl.searchParams.get("event_name") ?? "";
  const source = requestUrl.searchParams.get("source") ?? "";

  if ((siteId && !isKnownSiteId(siteId)) || (eventName && !isKnownEventName(eventName))) {
    return null;
  }

  return events.filter((event) => {
    if (siteId && event.site_id !== siteId) return false;
    if (eventName && event.event_name !== eventName) return false;
    if (source && sourceFrom(event) !== source) return false;
    return true;
  });
}

export default async function dashboardSummary(req: Request, _context: Context) {
  const token = bearerToken(req);
  if (!token) {
    return json(401, { error: "unauthorized" });
  }

  const supabaseUrl = getEnv("VITE_SUPABASE_URL");
  const anonKey = getEnv("VITE_SUPABASE_ANON_KEY");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(500, { error: "server_not_configured" });
  }

  const authClient = createClient(supabaseUrl, anonKey);
  const { data: authData, error: authError } = await authClient.auth.getUser(token);

  if (authError || !authData.user) {
    return json(401, { error: "unauthorized" });
  }

  if (!isAdminEmail(authData.user.email)) {
    return json(403, { error: "forbidden" });
  }

  const dateRange = dateRangeFrom(req);
  if (!dateRange) {
    return json(400, { error: "invalid_date_range" });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await serviceClient
    .from("analytics_events")
    .select("*")
    .gte("created_at", dateRange.from)
    .lte("created_at", dateRange.to)
    .order("created_at", { ascending: true });

  if (error) {
    return json(500, { error: "query_failed" });
  }

  const filtered = filteredEvents(req, (data ?? []) as AnalyticsEvent[]);
  if (!filtered) {
    return json(400, { error: "invalid_filter" });
  }

  return json(200, buildDashboardSummary(filtered) as unknown as Record<string, unknown>);
}

export const config: Config = {
  path: "/api/dashboard-summary"
};
