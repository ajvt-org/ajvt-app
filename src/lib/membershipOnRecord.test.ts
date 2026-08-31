import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { sourceFiles } from "@tests/sourceFiles";

const MEMBERSHIP = [
  "status",
  "paymentMethod",
  "rejectionReason",
  "paymentProof",
  "paidAmount",
  "surplusAnonymous",
  "referenceCode",
  "membershipYear",
];

const MEMBER_CALL = /(?:prisma|tx|db)\.member\.\w+\(\{/g;
const ACCOUNT_CALL = /(?:prisma|tx|db)\.user\.\w+\(\{/g;

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
    const at = rest.search(/(?:user|memberships):\s*\{/);
    if (at === -1) return out + rest;
    const open = rest.indexOf("{", at);
    out += rest.slice(0, at);
    rest = rest.slice(closingBrace(rest, open) + 1);
  }
}

function fieldNamed(block: string): string | undefined {
  return MEMBERSHIP.find((name) => new RegExp(`(?<![\\w.])${name}\\s*:`).test(block));
}

function memberBlocksIn(block: string): string[] {
  const blocks: string[] = [];
  let rest = block;
  for (;;) {
    const at = rest.search(/(?<![\w.])members:\s*\{/);
    if (at === -1) return blocks;
    const open = rest.indexOf("{", at);
    const end = closingBrace(rest, open);
    blocks.push(rest.slice(open, end + 1));
    rest = rest.slice(end + 1);
  }
}

function membershipNamedOnMember(): string[] {
  return ROOTS.flatMap(sourceFiles).flatMap((path) => {
    const source = readFileSync(path, "utf8");
    const found: string[] = [];
    const report = (index: number, field: string) =>
      found.push(`${path}:${source.slice(0, index).split("\n").length} ${field}`);

    for (const call of source.matchAll(MEMBER_CALL)) {
      const open = call.index + call[0].length - 1;
      const own = withoutAccountBlocks(source.slice(open, closingBrace(source, open) + 1));
      const field = fieldNamed(own);
      if (field) report(call.index, field);
    }

    for (const call of source.matchAll(ACCOUNT_CALL)) {
      const open = call.index + call[0].length - 1;
      const body = source.slice(open, closingBrace(source, open) + 1);
      for (const block of memberBlocksIn(body)) {
        const field = fieldNamed(withoutAccountBlocks(block));
        if (field) report(call.index, field);
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
      `{ data: { status: "ACTIVE", memberships: { create: { status: "x" } } } }`,
    );

    expect(own).toContain("status");
    expect(own.split("status").length - 1).toBe(1);
  });

  it("reads a member block hanging off an account too", () => {
    expect(memberBlocksIn(`{ select: { members: { select: { status: true } } } }`)).toEqual([
      `{ select: { status: true } }`,
    ]);
  });

  it("leaves a team's own members alone, which are a different row", () => {
    expect(memberBlocksIn(`{ select: { teamMembers: { select: { status: true } } } }`)).toEqual([]);
  });

  it("leaves no member query naming a membership field of its own", () => {
    expect(membershipNamedOnMember()).toEqual([]);
  });
});
