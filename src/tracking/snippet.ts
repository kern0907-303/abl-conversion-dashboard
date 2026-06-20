import type { SiteId } from "../analytics/constants";

function scriptString(value: string) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function trackingSnippet(siteId: SiteId, endpoint: string) {
  return `<script>
(function () {
  var siteId = ${scriptString(siteId)};
  var endpoint = ${scriptString(endpoint)};
  var visitorKey = "abl_visitor_id";
  var sessionKey = "abl_session_id";
  var utmFields = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
  var privateKeyPattern = /(name|full[_-]?name|first[_-]?name|last[_-]?name|phone|mobile|tel|email|mail|card|credit[_-]?card|payment[_-]?card|card[_-]?number|answer|answers|private[_-]?answer|private[_-]?answers|password|passcode|token|secret|ssn|national[_-]?id|identity|address|dob|birth|birthday|passport)/i;

  function createId(prefix) {
    var randomPart = window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
    return "abl_" + prefix + "_" + randomPart;
  }

  function safeStorage(name) {
    try {
      return window[name];
    } catch (error) {
      return null;
    }
  }

  function storedId(storage, key, prefix) {
    try {
      if (!storage) return createId(prefix);
      var current = storage.getItem(key);
      if (current) return current;
      var next = createId(prefix);
      storage.setItem(key, next);
      return next;
    } catch (error) {
      return createId(prefix);
    }
  }

  function metadataFrom(metadata) {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
    return Object.keys(metadata).reduce(function (safe, key) {
      var value = metadata[key];
      var safeValue = value === null || ["string", "number", "boolean"].indexOf(typeof value) !== -1;
      if (safeValue && !privateKeyPattern.test(key)) safe[key] = value;
      return safe;
    }, {});
  }

  var visitorId = storedId(safeStorage("localStorage"), visitorKey, "visitor");
  var sessionId = storedId(safeStorage("sessionStorage"), sessionKey, "session");

  window.ablTracker = {
    getVisitorId: function () {
      return visitorId;
    },
    track: function (eventName, metadata) {
      var params = new URLSearchParams(window.location.search);
      var payload = {
        site_id: siteId,
        event_name: eventName,
        visitor_id: visitorId,
        session_id: sessionId,
        page_url: window.location.href,
        referrer: document.referrer || null,
        metadata: metadataFrom(metadata)
      };

      utmFields.forEach(function (field) {
        payload[field] = params.get(field);
      });

      try {
        return fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(function () {});
      } catch (error) {
        return Promise.resolve();
      }
    },
    pageView: function () {
      return this.track("page_view");
    }
  };

  window.ablTracker.pageView();
})();
</script>`;
}
