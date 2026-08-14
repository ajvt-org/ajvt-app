import { describe, it, expect } from "vitest";
import { redact } from "./redact";

const REDACTED = "[محذوف]";

describe("redact", () => {
  it("leaves ordinary fields alone", () => {
    expect(redact({ fullName: "محمد", status: "ACTIVE" })).toEqual({
      fullName: "محمد",
      status: "ACTIVE",
    });
  });

  it("drops a password", () => {
    expect(redact({ password: "hunter2" })).toEqual({ password: REDACTED });
  });

  it("drops the temporary password an admin hands out", () => {
    expect(redact({ tempPassword: "AB12CD" })).toEqual({ tempPassword: REDACTED });
  });

  it("drops a stored hash, which is as good as the password for an attacker", () => {
    expect(redact({ hashedPassword: "$2b$12$abc" })).toEqual({ hashedPassword: REDACTED });
  });

  it("drops a token wherever it is nested", () => {
    expect(redact({ user: { session: { token: "abc" }, name: "محمد" } })).toEqual({
      user: { session: REDACTED, name: "محمد" },
    });
  });

  it("walks into arrays", () => {
    expect(redact([{ password: "a" }, { fullName: "محمد" }])).toEqual([
      { password: REDACTED },
      { fullName: "محمد" },
    ]);
  });

  it("matches whatever casing the field uses", () => {
    expect(redact({ Authorization: "Bearer x", TOKEN: "y" })).toEqual({
      Authorization: REDACTED,
      TOKEN: REDACTED,
    });
  });

  it("keeps null and primitives as they are", () => {
    expect(redact({ photo: null, paidAmount: 100, ok: true })).toEqual({
      photo: null,
      paidAmount: 100,
      ok: true,
    });
  });

  it("stops before a deeply nested structure can loop", () => {
    let nested: Record<string, unknown> = { fullName: "محمد" };
    for (let i = 0; i < 12; i++) nested = { inner: nested };

    expect(() => redact(nested)).not.toThrow();
    expect(JSON.stringify(redact(nested))).toContain(REDACTED);
  });
});
