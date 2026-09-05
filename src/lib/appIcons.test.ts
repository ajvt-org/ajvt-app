import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { COPIED_ICONS, RASTER_ICONS, drawIcon, readSource } from "../../scripts/buildIcons.mjs";

async function pixels(input: Buffer): Promise<Buffer> {
  return sharp(input).raw().toBuffer();
}

describe("the app icons", () => {
  it.each(COPIED_ICONS)("keeps %s the same drawing as the source", (path) => {
    expect(readFileSync(path).equals(readSource())).toBe(true);
  });

  it.each(RASTER_ICONS)("draws $path from the one source at $size", async (icon) => {
    const committed = await pixels(readFileSync(icon.path));
    const fresh = await pixels(await drawIcon(icon));

    expect(committed.equals(fresh)).toBe(true);
  });

  it.each(RASTER_ICONS)("gives $path the size it declares", async (icon) => {
    const { width, height } = await sharp(readFileSync(icon.path)).metadata();

    expect([width, height]).toEqual([icon.size, icon.size]);
  });

  it("leaves no two icons byte for byte the same file", () => {
    const bytes = RASTER_ICONS.map((icon) => readFileSync(icon.path).toString("base64"));

    expect(new Set(bytes).size).toBe(bytes.length);
  });
});
