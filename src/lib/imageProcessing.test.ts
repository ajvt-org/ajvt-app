import { describe, it, expect } from "vitest";
import sharp from "sharp";
import {
  processImage,
  toBaseFilename,
  MAX_UPLOAD_SIZE,
  MAX_DECODED_PIXELS,
} from "./imageProcessing";

const MINT = { r: 16, g: 39, b: 31 };

function flat(width: number, height: number, alpha = 1) {
  return sharp({
    create: { width, height, channels: 4, background: { ...MINT, alpha } },
  });
}

function photo() {
  return flat(1600, 1200).jpeg({ quality: 80 }).toBuffer();
}

function pastThePixelCap() {
  const side = Math.ceil(Math.sqrt(MAX_DECODED_PIXELS)) + 200;
  return flat(side, side).png({ compressionLevel: 9 }).toBuffer();
}

describe("toBaseFilename", () => {
  it("drops the thumbnail suffix and leaves the full name alone", () => {
    expect(toBaseFilename("abc-thumb.webp")).toBe("abc.webp");
    expect(toBaseFilename("abc.webp")).toBe("abc.webp");
  });
});

describe("processImage", () => {
  it("returns a full image and a thumbnail for an ordinary photo", async () => {
    const { full, thumbnail } = await processImage(await photo());

    const fullMeta = await sharp(full).metadata();
    const thumbMeta = await sharp(thumbnail).metadata();

    expect(fullMeta.format).toBe("webp");
    expect(thumbMeta.format).toBe("webp");
    expect(fullMeta.width).toBe(1400);
    expect(thumbMeta.width).toBe(300);
    expect(thumbnail.length).toBeLessThan(full.length);
  });

  it("refuses a picture past the pixel cap even when its file size is small", async () => {
    const buffer = await pastThePixelCap();

    expect(buffer.length).toBeLessThan(MAX_UPLOAD_SIZE);
    await expect(processImage(buffer)).rejects.toThrow();
  });

  it("keeps transparency through the WebP conversion", async () => {
    const crest = await flat(512, 512, 0)
      .composite([{ input: await flat(200, 200).png().toBuffer(), gravity: "centre" }])
      .png()
      .toBuffer();

    const { full, thumbnail } = await processImage(crest);

    expect((await sharp(full).metadata()).hasAlpha).toBe(true);
    expect((await sharp(thumbnail).metadata()).hasAlpha).toBe(true);
  });
});
