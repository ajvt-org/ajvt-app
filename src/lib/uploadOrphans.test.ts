import { describe, it, expect } from "vitest";
import {
  namesToKeep,
  orphanFiles,
  orphanFingerprints,
  referencedNames,
  sharedHashes,
  type Fingerprint,
} from "./uploadOrphans";

const OLD = new Date("2026-01-01");
const NEW = new Date("2026-09-06");
const SETTLED = new Date("2026-09-01");

function print(filename: string, sha256 = "hash", createdAt = OLD): Fingerprint {
  return { filename, sha256, createdAt };
}

describe("the names a record still holds", () => {
  it("gathers them across columns and drops the empty ones", () => {
    expect(referencedNames([["a.webp", null], [null], ["b.webp", "a.webp"]])).toEqual(
      new Set(["a.webp", "b.webp"]),
    );
  });

  it("is empty when no column holds anything", () => {
    expect(referencedNames([[null, null], []])).toEqual(new Set());
  });
});

describe("the fingerprints nothing refers to", () => {
  it("finds the one whose file has left every column", () => {
    const rows = [print("kept.webp"), print("gone.webp")];

    expect(
      orphanFingerprints(rows, new Set(["kept.webp"]), SETTLED).map((r) => r.filename),
    ).toEqual(["gone.webp"]);
  });

  it("leaves a fresh upload alone, since the record naming it may not be saved yet", () => {
    const rows = [print("just-now.webp", "hash", NEW)];

    expect(orphanFingerprints(rows, new Set(), SETTLED)).toEqual([]);
  });

  it("finds nothing when every fingerprint is still referred to", () => {
    const rows = [print("a.webp"), print("b.webp")];

    expect(orphanFingerprints(rows, new Set(["a.webp", "b.webp"]), SETTLED)).toEqual([]);
  });
});

describe("hashes held by more than one fingerprint", () => {
  it("counts the hash once however many rows hold it", () => {
    expect(sharedHashes([print("a.webp", "x"), print("b.webp", "x"), print("c.webp", "x")])).toBe(
      1,
    );
  });

  it("counts a hash held by one row as no sharing at all", () => {
    expect(sharedHashes([print("a.webp", "x"), print("b.webp", "y")])).toBe(0);
  });

  it("counts each shared hash separately", () => {
    expect(
      sharedHashes([
        print("a.webp", "x"),
        print("b.webp", "x"),
        print("c.webp", "y"),
        print("d.webp", "y"),
      ]),
    ).toBe(2);
  });
});

describe("the files a repair keeps", () => {
  it("keeps the thumbnail of everything it keeps", () => {
    expect(namesToKeep(new Set(["a.webp"]), [print("b.webp")])).toEqual(
      new Set(["a.webp", "a-thumb.webp", "b.webp", "b-thumb.webp"]),
    );
  });

  it("keeps a file whose fingerprint survives even when no column names it", () => {
    const keep = namesToKeep(new Set(), [print("held.webp")]);

    expect(orphanFiles([{ name: "held.webp", modifiedAt: OLD }], keep, SETTLED)).toEqual([]);
  });

  it("keeps the thumbnail of a name a column still holds", () => {
    const keep = namesToKeep(new Set(["a.webp"]), []);

    expect(orphanFiles([{ name: "a-thumb.webp", modifiedAt: OLD }], keep, SETTLED)).toEqual([]);
  });

  it("finds a file nothing names at all", () => {
    const keep = namesToKeep(new Set(["a.webp"]), []);

    expect(
      orphanFiles([{ name: "stray.webp", modifiedAt: OLD }], keep, SETTLED).map((f) => f.name),
    ).toEqual(["stray.webp"]);
  });

  it("leaves a file written moments ago alone", () => {
    const keep = namesToKeep(new Set(), []);

    expect(orphanFiles([{ name: "fresh.webp", modifiedAt: NEW }], keep, SETTLED)).toEqual([]);
  });
});
