import type { Config, Context } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { isKnownEventName, isKnownSiteId, type SiteId } from "../../src/analytics/constants";

type TrackingPayload = Record<string, unknown>;

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

const optionalTextFields = ["referrer", "utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
const privateMetadataKeyPattern =
  /(name|full[_-]?name|first[_-]?name|last[_-]?name|phone|mobile|tel|email|mail|card|credit[_-]?card|payment[_-]?card|card[_-]?number|answer|answers|private[_-]?answer|private[_-]?answers|password|passcode|token|secret|ssn|national[_-]?id|identity|address|dob|birth|birthday|passport)/i;

const siteOrigins: Record<SiteId, string> = {
  quantum_frequency_assessment: "https://quantum-frequency-assessment.netlify.app",
  timewaver_audio_sales: "https://timewaver-audio-sales.netlify.app"
};

const siteIdByOrigin = Object.fromEntries(
  Object.entries(siteOrigins).map(([siteId, origin]) => [origin, siteId])
) as Record<string, SiteId | undefined>;

function getEnv(name: string): string | undefined {
  const runtime = globalThis as RuntimeEnv;
  return runtime.Netlify?.env?.get(name) ?? runtime.process?.env?.[name];
}

function allowedOrigins() {
  return (getEnv("TRACKING_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowList = allowedOrigins();

  if (!origin || allowList.length === 0 || !allowList.includes(origin)) {
    return {};
  }

  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type"
  };
}

function json(status: number, body: Record<string, unknown>, origin: string | null) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...corsHeaders(origin)
  };

  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers
  });
}

function isAllowedOrigin(origin: string | null) {
  const allowList = allowedOrigins();
  return Boolean(origin && allowList.length > 0 && allowList.includes(origin));
}

function asRequiredString(payload: TrackingPayload, field: string) {
  const value = payload[field];
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalString(payload: TrackingPayload, field: (typeof optionalTextFields)[number]) {
  const value = payload[field];
  return typeof value === "string" && value.trim() ? value : null;
}

function metadataFrom(payload: TrackingPayload) {
  const metadata = payload.metadata;
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata).filter(([key, value]) => {
      const isSafeValue = value === null || ["string", "number", "boolean"].includes(typeof value);
      return isSafeValue && !privateMetadataKeyPattern.test(key);
    })
  );
}

function hasExpectedPageHost(siteId: SiteId, pageUrl: string) {
  try {
    return new URL(pageUrl).host === new URL(siteOrigins[siteId]).host;
  } catch {
    return false;
  }
}

export default async function track(req: Request, _context: Context) {
  const origin = req.headers.get("origin");

  if (!isAllowedOrigin(origin)) {
    return json(403, { error: "origin_not_allowed" }, null);
  }

  if (req.method === "OPTIONS") {
    return json(204, {}, origin);
  }

  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed" }, origin);
  }

  let payload: TrackingPayload;
  try {
    payload = (await req.json()) as TrackingPayload;
  } catch {
    return json(400, { error: "invalid_json" }, origin);
  }

  const siteId = asRequiredString(payload, "site_id");
  const eventName = asRequiredString(payload, "event_name");
  const visitorId = asRequiredString(payload, "visitor_id");
  const sessionId = asRequiredString(payload, "session_id");
  const pageUrl = asRequiredString(payload, "page_url");

  if (!isKnownSiteId(siteId) || !isKnownEventName(eventName) || !visitorId || !sessionId || !pageUrl) {
    return json(400, { error: "invalid_event" }, origin);
  }

  if ((origin && siteIdByOrigin[origin] !== siteId) || !hasExpectedPageHost(siteId, pageUrl)) {
    return json(400, { error: "invalid_event" }, origin);
  }

  const supabaseUrl = getEnv("VITE_SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "server_not_configured" }, origin);
  }

  const eventRow = {
    site_id: siteId,
    event_name: eventName,
    visitor_id: visitorId,
    session_id: sessionId,
    page_url: pageUrl,
    referrer: asOptionalString(payload, "referrer"),
    utm_source: asOptionalString(payload, "utm_source"),
    utm_medium: asOptionalString(payload, "utm_medium"),
    utm_campaign: asOptionalString(payload, "utm_campaign"),
    utm_content: asOptionalString(payload, "utm_content"),
    metadata: metadataFrom(payload)
  };

  const { error } = await createClient(supabaseUrl, serviceRoleKey).from("analytics_events").insert(eventRow);

  if (error) {
    return json(500, { error: "insert_failed" }, origin);
  }

  return json(202, { ok: true }, origin);
}

export const config: Config = {
  path: "/api/track"
};
