import { describe, it, expect, vi } from "vitest";
import { releaseCaptain, captainIsOnTheRoster } from "./teamCaptainServer";

function db(membership: { id: string } | null = null) {
  const updateMany = vi.fn().mockResolvedValue({ count: 0 });
  const findUnique = vi.fn().mockResolvedValue(membership);
  const client = { team: { updateMany }, teamMember: { findUnique } };
  return {
    client: client as unknown as Parameters<typeof releaseCaptain>[0],
    updateMany,
    findUnique,
  };
}

describe("releasing the captain", () => {
  it("only touches the team that names the player who is leaving", async () => {
    const { client, updateMany } = db();

    await releaseCaptain(client, "team-1", "user-1");

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "team-1", captainUserId: "user-1" },
      data: { captainUserId: null },
    });
  });
});

describe("checking a captain against the roster", () => {
  it("takes a player who has a place on the team", async () => {
    const { client, findUnique } = db({ id: "roster-1" });

    expect(await captainIsOnTheRoster(client, "team-1", "user-1")).toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { teamId_userId: { teamId: "team-1", userId: "user-1" } },
      select: { id: true },
    });
  });

  it("refuses a player who has none", async () => {
    const { client } = db(null);

    expect(await captainIsOnTheRoster(client, "team-1", "user-1")).toBe(false);
  });
});
