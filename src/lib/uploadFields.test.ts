import { describe, it, expect, beforeEach, vi } from "vitest";

interface Call {
  model: string;
  op: string;
  args: Record<string, unknown>;
}

const state = vi.hoisted(() => ({
  calls: [] as Call[],
  row: null as unknown,
}));

vi.mock("./prisma", () => ({
  prisma: new Proxy(
    {},
    {
      get: (_target, model: string) => {
        if (model.startsWith("$")) {
          return (args: Record<string, unknown>) => {
            state.calls.push({ model: "prisma", op: model, args });
            return Promise.resolve([]);
          };
        }
        return new Proxy(
          {},
          {
            get: (_t, op: string) => (args: Record<string, unknown>) => {
              state.calls.push({ model, op, args });
              return Promise.resolve(op === "findMany" ? [] : state.row);
            },
          },
        );
      },
    },
  ),
}));

const { UPLOAD_FIELDS, locateUpload, renameUpload } = await import("./uploadFields");

function partsOf(id: string): { model: string; field: string } {
  const [model, field] = id.split(".");
  return { model, field };
}

function locatorOf(id: string) {
  const field = UPLOAD_FIELDS.find((f) => f.id === id)!;
  if (field.serve.via !== "authenticated") throw new Error(`${id} has no resolver`);
  return field.serve.locate;
}

const lastCall = () => state.calls[state.calls.length - 1];

beforeEach(() => {
  state.calls = [];
  state.row = null;
});

describe("every registry entry", () => {
  it.each(UPLOAD_FIELDS.map((f) => [f.id, f] as const))(
    "%s reads its own column",
    async (id, f) => {
      const { model, field } = partsOf(id);

      await f.names();

      expect(lastCall().model).toBe(model);
      expect(lastCall().op).toBe("findMany");
      expect(lastCall().args).toEqual({ select: { [field]: true } });
    },
  );

  it.each(UPLOAD_FIELDS.map((f) => [f.id, f] as const))(
    "%s renames its own column",
    async (id, f) => {
      const { model, field } = partsOf(id);

      await f.rename("old.png", "new.webp");

      expect(lastCall().model).toBe(model);
      expect(lastCall().op).toBe("updateMany");
      expect(lastCall().args).toEqual({
        where: { [field]: "old.png" },
        data: { [field]: "new.webp" },
      });
    },
  );

  it.each(UPLOAD_FIELDS.filter((f) => f.serve.via === "authenticated").map((f) => [f.id] as const))(
    "%s looks the owner up by its own column",
    async (id) => {
      const { model, field } = partsOf(id);

      await locatorOf(id)("proof.webp");

      expect(lastCall().model).toBe(model);
      expect(lastCall().op).toBe("findFirst");
      expect((lastCall().args as { where: Record<string, unknown> }).where[field]).toBe(
        "proof.webp",
      );
    },
  );
});

describe("locateUpload", () => {
  it("answers nothing when no column holds the name", async () => {
    expect(await locateUpload("nobody.webp")).toBeNull();
  });

  it("takes the first match, so a member photo wins over a later column", async () => {
    state.row = { userId: "u1", member: { userId: "u1" }, purpose: "DONATION" };

    expect(await locateUpload("shared.webp")).toEqual({ kind: "photo", ownerId: "u1" });
  });

  it("asks every serving column and no other", async () => {
    await locateUpload("shared.webp");

    const asked = state.calls.filter((c) => c.op === "findFirst").map((c) => c.model);
    expect(asked).toEqual([
      "member",
      "member",
      "membership",
      "activityRegistration",
      "donation",
      "payment",
      "expense",
    ]);
  });
});

describe("payment proofs", () => {
  const locate = locatorOf("payment.proof");

  it.each([
    ["MEMBERSHIP", "membership"],
    ["ACTIVITY", "activity"],
    ["DONATION", "donations"],
  ])("reads a %s payment as a %s proof", async (purpose, kind) => {
    state.row = { purpose, member: { userId: "u1" } };

    expect(await locate("proof.webp")).toEqual({ kind, ownerId: "u1" });
  });

  it("keeps a payment with no member admin only", async () => {
    state.row = { purpose: "DONATION", member: null };

    expect(await locate("proof.webp")).toEqual({ kind: "donations", ownerId: null });
  });
});

describe("renameUpload", () => {
  it("sends every rename and the fingerprint as one transaction", async () => {
    await renameUpload("old.png", "new.webp", "hash");

    expect(state.calls.filter((c) => c.op === "$transaction")).toHaveLength(1);
    expect(state.calls.filter((c) => c.op === "updateMany")).toHaveLength(UPLOAD_FIELDS.length + 1);
    expect(state.calls.at(-2)).toMatchObject({
      model: "proofImage",
      op: "updateMany",
      args: { where: { filename: "old.png" }, data: { filename: "new.webp", sha256: "hash" } },
    });
  });
});
