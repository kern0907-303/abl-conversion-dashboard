import { describe, expect, it } from "vitest";
import { trackingSnippet } from "./snippet";

describe("trackingSnippet", () => {
  it("uses guarded storage access in the inline snippet", () => {
    const snippet = trackingSnippet("quantum_frequency_assessment", "https://abl-dashboard.netlify.app/api/track");

    expect(snippet).toContain("function safeStorage(name)");
    expect(snippet).toContain('storedId(safeStorage("localStorage"), visitorKey, "visitor")');
    expect(snippet).toContain('storedId(safeStorage("sessionStorage"), sessionKey, "session")');
    expect(snippet).not.toContain("storedId(window.localStorage");
    expect(snippet).not.toContain("storedId(window.sessionStorage");
  });
});
