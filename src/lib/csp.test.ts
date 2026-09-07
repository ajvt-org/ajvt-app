import { describe, it, expect } from "vitest";
import { contentSecurityPolicy, newNonce } from "./csp";

function directive(policy: string, name: string): string {
  return policy.split("; ").find((part) => part.startsWith(`${name} `)) ?? "";
}

describe("newNonce", () => {
  it("hands out a different value every time", () => {
    const values = new Set(Array.from({ length: 50 }, newNonce));

    expect(values.size).toBe(50);
  });

  it("carries nothing that would end the directive early", () => {
    expect(newNonce()).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});

describe("contentSecurityPolicy", () => {
  const policy = contentSecurityPolicy("abc123");

  it("names the nonce in the script policy", () => {
    expect(directive(policy, "script-src")).toContain("'nonce-abc123'");
  });

  it("allows no inline script", () => {
    expect(directive(policy, "script-src")).not.toContain("'unsafe-inline'");
  });

  it("leaves the style policy as it was, since inline styles run through the screens", () => {
    expect(directive(policy, "style-src")).toBe(
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    );
  });

  it("keeps the rest of the policy", () => {
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("form-action 'self'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).toContain("font-src 'self' https://fonts.gstatic.com");
  });

  it("allows evaluation in development only, where React needs it for stack traces", () => {
    expect(directive(contentSecurityPolicy("abc123", true), "script-src")).toContain(
      "'unsafe-eval'",
    );
    expect(directive(policy, "script-src")).not.toContain("'unsafe-eval'");
  });
});
