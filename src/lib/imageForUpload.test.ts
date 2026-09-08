import { describe, it, expect, vi, afterEach } from "vitest";
import { prepareImageForUpload } from "./imageForUpload";
import { uploads } from "./messages";

const HUGE = 3 * 1024 * 1024;

function file(type: string, size = 10) {
  return new File([new Uint8Array(size)], "picked", { type });
}

function browserThatDecodes(encoded: Blob | null) {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ width: 4000, height: 3000, close() {} })),
  );
  vi.stubGlobal("document", {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({ drawImage() {} }),
      toBlob: (done: (blob: Blob | null) => void) => done(encoded),
    }),
  });
}

function browserThatCannotDecode() {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => {
      throw new Error("no decoder");
    }),
  );
  vi.stubGlobal("document", { createElement: () => null });
}

afterEach(() => vi.unstubAllGlobals());

describe("preparing a picked image", () => {
  it("sends a small readable photo exactly as it was picked", async () => {
    const picked = file("image/jpeg");

    expect(await prepareImageForUpload(picked)).toBe(picked);
  });

  it("converts a format the server cannot read however small it is", async () => {
    const converted = new Blob([new Uint8Array(5)], { type: "image/jpeg" });
    browserThatDecodes(converted);

    expect(await prepareImageForUpload(file("image/heic"))).toBe(converted);
  });

  it("shrinks a readable photo that is too heavy to send as it is", async () => {
    const smaller = new Blob([new Uint8Array(100)], { type: "image/jpeg" });
    browserThatDecodes(smaller);

    expect(await prepareImageForUpload(file("image/jpeg", HUGE))).toBe(smaller);
  });

  it("keeps the original when re-encoding it would make it bigger", async () => {
    browserThatDecodes(new Blob([new Uint8Array(HUGE * 2)], { type: "image/jpeg" }));
    const picked = file("image/jpeg", HUGE);

    expect(await prepareImageForUpload(picked)).toBe(picked);
  });

  it("still sends a readable photo when the browser cannot re-encode it", async () => {
    browserThatCannotDecode();
    const picked = file("image/jpeg", HUGE);

    expect(await prepareImageForUpload(picked)).toBe(picked);
  });

  it("refuses a format neither side can read rather than sending it to fail", async () => {
    browserThatCannotDecode();

    await expect(prepareImageForUpload(file("image/heic"))).rejects.toThrow(uploads.cannotConvert);
  });
});
