import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import nextConfig from "../next.config";
import { LOGO_PATHS, OG_CARD } from "@/lib/logo";
import { RECEIPT_LOGO, RECEIPT_SEAL } from "@/components/receipt/receiptStyle";

type Rule = { source: string; headers: { key: string; value: string }[] };

const REVALIDATED = /^(no-cache|public, max-age=0, must-revalidate)$/;

const manifest = JSON.parse(readFileSync("public/manifest.json", "utf8")) as {
  icons: { src: string }[];
};

const SERVED_FROM_PUBLIC = readdirSync("public", { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => `/${entry.name}`);

const LINKED_BY_THE_APP = [
  ...LOGO_PATHS,
  OG_CARD.url,
  RECEIPT_LOGO,
  RECEIPT_SEAL,
  ...manifest.icons.map((icon) => icon.src),
];

let rules: Rule[] = [];

function matches(source: string, path: string): boolean {
  if (source.endsWith("/:path*")) return path.startsWith(source.slice(0, -"/:path*".length) + "/");
  return source === path;
}

function cacheControl(path: string): string | undefined {
  return rules
    .filter((rule) => matches(rule.source, path))
    .flatMap((rule) => rule.headers)
    .filter((header) => header.key === "Cache-Control")
    .at(-1)?.value;
}

beforeAll(async () => {
  vi.stubEnv("NODE_ENV", "production");
  rules = (await nextConfig.headers!()) as Rule[];
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe("the cache lifetime of what public serves", () => {
  it.each(SERVED_FROM_PUBLIC)("makes a browser ask again before reusing %s", (path) => {
    expect(cacheControl(path)).toMatch(REVALIDATED);
  });

  it.each(LINKED_BY_THE_APP)("revalidates %s, which the app links to", (path) => {
    expect(SERVED_FROM_PUBLIC).toContain(path);
    expect(cacheControl(path)).toMatch(REVALIDATED);
  });

  it("keeps the fonts for a year, since a changed face gets a new name", () => {
    expect(cacheControl("/fonts/tajawal-400.woff2")).toBe("public, max-age=31536000, immutable");
  });
});
