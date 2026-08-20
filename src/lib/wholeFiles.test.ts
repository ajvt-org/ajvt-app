import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { completeFiles, writeWhole, PART_SUFFIX } from "./wholeFiles";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "ajvt-whole-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("writeWhole", () => {
  it("leaves the file under its real name with all its bytes", async () => {
    await writeWhole(dir, "photo.webp", Buffer.from("abcdef"));

    expect((await readFile(join(dir, "photo.webp"))).toString()).toBe("abcdef");
  });

  it("keeps no temporary file behind", async () => {
    await writeWhole(dir, "photo.webp", Buffer.from("abcdef"));

    expect((await readdir(dir)).some((n) => n.endsWith(PART_SUFFIX))).toBe(false);
  });

  it("replaces a truncated file left by an earlier run", async () => {
    await writeFile(join(dir, "photo.webp"), Buffer.alloc(0));

    await writeWhole(dir, "photo.webp", Buffer.from("abcdef"));

    expect((await stat(join(dir, "photo.webp"))).size).toBe(6);
  });
});

describe("completeFiles", () => {
  it("lists the files that carry bytes", async () => {
    await writeFile(join(dir, "full.webp"), Buffer.from("x"));
    await writeFile(join(dir, "other.webp"), Buffer.from("yz"));

    expect(await completeFiles(dir)).toEqual(new Set(["full.webp", "other.webp"]));
  });

  it("treats an empty file as missing, so the work is planned again", async () => {
    await writeFile(join(dir, "empty.webp"), Buffer.alloc(0));

    expect(await completeFiles(dir)).toEqual(new Set());
  });

  it("sweeps a temporary file a killed run left behind", async () => {
    await writeFile(join(dir, `photo.webp.999${PART_SUFFIX}`), Buffer.from("half"));

    const whole = await completeFiles(dir);

    expect(whole.size).toBe(0);
    expect(await readdir(dir)).toEqual([]);
  });
});
