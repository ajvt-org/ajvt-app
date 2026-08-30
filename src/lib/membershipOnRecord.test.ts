import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { sourceFiles } from "@tests/sourceFiles";

const MEMBERSHIP = [
  "status",
  "rejectionReason",
  "paymentProof",
  "paidAmount",
  "surplusAnonymous",
  "referenceCode",
  "membershipYear",
];

const MEMBER_CALL = /(?:prisma|tx|db)\.member\.\w+\(\{/g;

const ROOTS = ["src", "tests", "prisma"];

function closingBrace(source: string, open: number): number {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return source.length - 1;
}

function withoutAccountBlocks(block: string): string {
  let rest = block;
  let out = "";
  for (;;) {
    const at = rest.search(/user:\s*\{/);
    if (at === -1) return out + rest;
    const open = rest.indexOf("{", at);
    out += rest.slice(0, at);
    rest = rest.slice(closingBrace(rest, open) + 1);
  }
}

function membershipNamedOnMember(): string[] {
  return ROOTS.flatMap(sourceFiles).flatMap((path) => {
    const source = readFileSync(path, "utf8");
    const found: string[] = [];
    for (const call of source.matchAll(MEMBER_CALL)) {
      const open = call.index + call[0].length - 1;
      const own = withoutAccountBlocks(source.slice(open, closingBrace(source, open) + 1));
      const field = MEMBERSHIP.find((name) => new RegExp(`(?<![\\w.])${name}\\s*:`).test(own));
      if (field) {
        const line = source.slice(0, call.index).split("\n").length;
        found.push(`${path}:${line} ${field}`);
      }
    }
    return found;
  });
}

describe("the membership lives on the year record", () => {
  it("finds the member queries it should be reading", () => {
    expect(ROOTS.flatMap(sourceFiles).length).toBeGreaterThan(200);
  });

  it("sees a membership field named straight on a member", () => {
    const own = withoutAccountBlocks(
      `{ data: { status: "ACTIVE", user: { create: { memberships: { create: { status: "x" } } } } } }`,
    );

    expect(own).toContain("status");
    expect(own.split("status").length - 1).toBe(1);
  });

  it("leaves no member query naming a membership field of its own", () => {
    expect(membershipNamedOnMember()).toEqual([]);
  });
});
