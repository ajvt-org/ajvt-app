import { describe, it, expect, vi, beforeEach } from "vitest";

const readFile = vi.hoisted(() => vi.fn());
vi.mock("fs/promises", () => ({ readFile }));

const { isSafeUploadName, servePublicUpload, servePrivateUpload } = await import("./serveUpload");

const anything = async () => true;

beforeEach(() => {
  readFile.mockReset();
  readFile.mockResolvedValue(Buffer.from("image-bytes"));
});

describe("the name a caller asks for", () => {
  it("accepts a plain upload name", () => {
    expect(isSafeUploadName("abc.webp")).toBe(true);
  });

  it("refuses anything that could climb out of the upload directory", () => {
    for (const name of ["", "../secrets.webp", "a/b.webp", "..", "nested/../x.webp"]) {
      expect(isSafeUploadName(name)).toBe(false);
    }
  });

  it("never reads a file for a name it refused", async () => {
    const res = await servePublicUpload("../secrets.webp", anything);

    expect(res.status).toBe(404);
    expect(readFile).not.toHaveBeenCalled();
  });
});

describe("serving an upload", () => {
  it("hands back the bytes with the type read off the extension", async () => {
    const res = await servePublicUpload("abc.webp", anything);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/webp");
    expect(await res.text()).toBe("image-bytes");
  });

  it("names a type for every extension it stores, and a safe default otherwise", async () => {
    const typeOf = async (name: string) =>
      (await servePublicUpload(name, anything)).headers.get("Content-Type");

    expect(await typeOf("a.jpg")).toBe("image/jpeg");
    expect(await typeOf("a.JPEG")).toBe("image/jpeg");
    expect(await typeOf("a.png")).toBe("image/png");
    expect(await typeOf("a.pdf")).toBe("application/octet-stream");
  });

  it("checks the thumbnail against the name the record actually stores", async () => {
    const seen: string[] = [];
    await servePublicUpload("abc-thumb.webp", async (base) => {
      seen.push(base);
      return true;
    });

    expect(seen).toEqual(["abc.webp"]);
  });

  it("says not found when nothing claims the file", async () => {
    const res = await servePublicUpload("abc.webp", async () => false);

    expect(res.status).toBe(404);
    expect(readFile).not.toHaveBeenCalled();
  });

  it("says not found when the file is gone from disk", async () => {
    readFile.mockRejectedValue(new Error("ENOENT"));

    expect((await servePublicUpload("abc.webp", anything)).status).toBe(404);
  });

  it("says not found when the check itself fails", async () => {
    const res = await servePublicUpload("abc.webp", async () => {
      throw new Error("db down");
    });

    expect(res.status).toBe(404);
  });
});

describe("who may cache what", () => {
  it("lets a shared cache keep a public file", async () => {
    const res = await servePublicUpload("abc.webp", anything);

    expect(res.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
  });

  it("keeps a private file out of a shared cache", async () => {
    const res = await servePrivateUpload("abc.webp", anything);

    expect(res.headers.get("Cache-Control")).toBe("private, max-age=31536000, immutable");
  });
});
