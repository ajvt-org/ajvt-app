import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { MATCH_TEAMS_SIZES } from "./matchCard/MatchTeams";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith(".tsx") && !path.includes(".test.") ? [path] : [];
  });
}

const CREST_CALL = /<TeamLogo[\s\S]*?\/>/g;

describe("the crest scale", () => {
  it("holds every step a caller can ask for", () => {
    const sizes = Object.values(MATCH_TEAMS_SIZES).map((step) => step.logo);

    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
    expect(new Set(sizes).size).toBe(sizes.length);
  });

  it("is the only place a crest size is written down", () => {
    const offenders = ["src/components", "src/app"].flatMap(sourceFiles).flatMap((path) => {
      const calls = readFileSync(path, "utf8").match(CREST_CALL) ?? [];
      return calls.filter((call) => /size=\{\s*\d+\s*\}/.test(call)).map(() => path);
    });

    expect(offenders).toEqual([]);
  });
});
