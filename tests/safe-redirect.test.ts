import { describe, expect, it } from "vitest";
import { safeAppRedirect } from "@/lib/safe-redirect";

describe("safeAppRedirect", () => {
  it("keeps app routes", () => {
    expect(safeAppRedirect("/clients")).toBe("/clients");
    expect(safeAppRedirect("/properties/new")).toBe("/properties/new");
  });

  it("rejects chrome probes and open redirects", () => {
    expect(
      safeAppRedirect("/.well-known/appspecific/com.chrome.devtools.json"),
    ).toBe("/dashboard");
    expect(safeAppRedirect("//evil.test")).toBe("/dashboard");
    expect(safeAppRedirect("/login")).toBe("/dashboard");
    expect(safeAppRedirect("https://evil.test")).toBe("/dashboard");
    expect(safeAppRedirect(undefined)).toBe("/dashboard");
  });
});
