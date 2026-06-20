import type { EventName, SiteId } from "../analytics/constants";

export type TrackerOptions = {
  siteId: SiteId;
  endpoint: string;
};

export type Tracker = {
  getVisitorId(): string;
  track(eventName: EventName, metadata?: unknown): Promise<void>;
  pageView(): Promise<void>;
};

const visitorStorageKey = "abl_visitor_id";
const sessionStorageKey = "abl_session_id";
const utmFields = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
const privateMetadataKeyPattern =
  /(name|full[_-]?name|first[_-]?name|last[_-]?name|phone|mobile|tel|email|mail|card|credit[_-]?card|payment[_-]?card|card[_-]?number|answer|answers|private[_-]?answer|private[_-]?answers|password|passcode|token|secret|ssn|national[_-]?id|identity|address|dob|birth|birthday|passport)/i;

let memoryVisitorId: string | null = null;
let memorySessionId: string | null = null;

function createAnonymousId(prefix: "visitor" | "session") {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  return `abl_${prefix}_${randomPart}`;
}

function readPersistedId(storage: Storage, key: string, prefix: "visitor" | "session") {
  const currentId = storage.getItem(key);

  if (currentId) {
    return currentId;
  }

  const nextId = createAnonymousId(prefix);
  storage.setItem(key, nextId);
  return nextId;
}

function getVisitorIdFromStorage() {
  try {
    memoryVisitorId = readPersistedId(localStorage, visitorStorageKey, "visitor");
  } catch {
    memoryVisitorId ??= createAnonymousId("visitor");
  }

  return memoryVisitorId;
}

function getSessionIdFromStorage() {
  try {
    memorySessionId = readPersistedId(sessionStorage, sessionStorageKey, "session");
  } catch {
    memorySessionId ??= createAnonymousId("session");
  }

  return memorySessionId;
}

function currentUtmParams() {
  const params = new URLSearchParams(window.location.search);

  return Object.fromEntries(utmFields.map((field) => [field, params.get(field)]));
}

function normalizeMetadata(metadata: unknown) {
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

export function createTracker({ siteId, endpoint }: TrackerOptions): Tracker {
  const visitorId = getVisitorIdFromStorage();
  const sessionId = getSessionIdFromStorage();

  async function track(eventName: EventName, metadata: unknown = {}) {
    const payload = {
      site_id: siteId,
      event_name: eventName,
      visitor_id: visitorId,
      session_id: sessionId,
      page_url: window.location.href,
      referrer: document.referrer || null,
      ...currentUtmParams(),
      metadata: normalizeMetadata(metadata)
    };

    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch {
      // Tracking must never interrupt the public site experience.
    }
  }

  return {
    getVisitorId: () => visitorId,
    track,
    pageView: () => track("page_view")
  };
}
