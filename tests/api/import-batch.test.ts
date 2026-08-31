import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  claimImportBatch,
  fileHashOf,
  importBatchOf,
  lastImportOfFile,
} from "@/lib/importBatchServer";
import { resetDb } from "./helpers";

const FILE = "الاسم الكامل\nمحمد ولد أحمد";

function claim(over: Record<string, unknown> = {}) {
  return {
    id: "batch-1",
    fileHash: fileHashOf(FILE),
    fileName: "members.csv",
    rowCount: 1,
    createdBy: "members-admin",
    ...over,
  };
}

describe("import batches", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("hashes the same content to the same value and different content to a different one", () => {
    expect(fileHashOf(FILE)).toBe(fileHashOf(FILE));
    expect(fileHashOf(FILE)).not.toBe(fileHashOf(`${FILE}\nأحمد ولد محمد`));
  });

  it("claims a batch that has not run", async () => {
    expect(await claimImportBatch(claim())).toBe(true);

    const stored = await importBatchOf("batch-1");
    expect(stored?.createdBy).toBe("members-admin");
    expect(stored?.rowCount).toBe(1);
  });

  it("refuses to claim the same batch twice", async () => {
    expect(await claimImportBatch(claim())).toBe(true);
    expect(await claimImportBatch(claim())).toBe(false);

    expect(await prisma.importBatch.count()).toBe(1);
  });

  it("claims two batches carrying the same file under different ids", async () => {
    expect(await claimImportBatch(claim())).toBe(true);
    expect(await claimImportBatch(claim({ id: "batch-2" }))).toBe(true);
  });

  it("finds the last run of a file the admin has uploaded before", async () => {
    await claimImportBatch(claim({ id: "batch-1" }));
    await claimImportBatch(claim({ id: "batch-2", createdBy: "another-admin" }));

    const last = await lastImportOfFile(fileHashOf(FILE));
    expect(last?.createdBy).toBe("another-admin");
  });

  it("finds nothing for a file that has never been imported", async () => {
    expect(await lastImportOfFile(fileHashOf("something else"))).toBeNull();
  });
});
