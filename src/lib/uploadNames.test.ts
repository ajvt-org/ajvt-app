import { describe, it, expect } from "vitest";
import { namesToRelease, thumbnailOf } from "./uploadNames";

describe("the name of a thumbnail", () => {
  it("puts the suffix before the extension, where the writer puts it", () => {
    expect(thumbnailOf("7f3a.webp")).toBe("7f3a-thumb.webp");
  });

  it("keeps a name that carries dots of its own", () => {
    expect(thumbnailOf("a.b.c.webp")).toBe("a.b.c-thumb.webp");
  });

  it("appends to a name with no extension at all", () => {
    expect(thumbnailOf("proof")).toBe("proof-thumb");
  });

  it("leaves a leading dot alone rather than reading it as an extension", () => {
    expect(thumbnailOf(".webp")).toBe(".webp-thumb");
  });
});

describe("the names a release considers", () => {
  it("drops what is not a name", () => {
    expect(namesToRelease([null, undefined, "", "one.webp"])).toEqual(["one.webp"]);
  });

  it("looks at a name once however many times it is handed over", () => {
    expect(namesToRelease(["one.webp", "one.webp", "two.webp"])).toEqual(["one.webp", "two.webp"]);
  });

  it("has nothing to do when nothing was named", () => {
    expect(namesToRelease([])).toEqual([]);
  });
});
