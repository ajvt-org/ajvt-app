import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { sourceFiles } from "@tests/sourceFiles";
import { PERSON_SELECT } from "./person";

const PERSON_FIELDS = Object.keys(PERSON_SELECT);

const ALLOWED = ["src/lib/person.ts"];

function selectBlocks(source: string): string[] {
  const blocks: string[] = [];
  for (const match of source.matchAll(/select:\s*\{/g)) {
    const open = match.index + match[0].length - 1;
    let depth = 0;
    for (let i = open; i < source.length; i++) {
      if (source[i] === "{") depth += 1;
      else if (source[i] === "}") {
        depth -= 1;
        if (depth === 0) {
          blocks.push(source.slice(open, i + 1));
          break;
        }
      }
    }
  }
  return blocks;
}

function ownKeys(block: string): Set<string> {
  let depth = 0;
  let own = "";
  for (const char of block) {
    if (char === "{") depth += 1;
    if (depth === 1) own += char;
    if (char === "}") depth -= 1;
  }
  return new Set([...own.matchAll(/(\w+):\s*true/g)].map((m) => m[1]));
}

function copies(): string[] {
  const found: string[] = [];
  for (const root of ["src", "tests", "prisma"]) {
    for (const file of sourceFiles(root)) {
      if (ALLOWED.includes(file.replace(/\\/g, "/"))) continue;
      const source = readFileSync(file, "utf8");
      for (const block of selectBlocks(source)) {
        const keys = ownKeys(block);
        if (PERSON_FIELDS.every((field) => keys.has(field))) {
          found.push(file);
          break;
        }
      }
    }
  }
  return found;
}

describe("the whole person is selected from one place", () => {
  it("finds no hand-written copy of the seven person fields", () => {
    expect(copies()).toEqual([]);
  });

  it("would notice a copy if one were written", () => {
    const block = `select: { ${PERSON_FIELDS.map((f) => `${f}: true`).join(", ")} }`;
    expect(PERSON_FIELDS.every((f) => ownKeys(selectBlocks(block)[0]).has(f))).toBe(true);
  });

  it("leaves a deliberately smaller select alone", () => {
    const block = "select: { fullName: true, memberNumber: true }";
    const keys = ownKeys(selectBlocks(block)[0]);
    expect(PERSON_FIELDS.every((f) => keys.has(f))).toBe(false);
  });
});
