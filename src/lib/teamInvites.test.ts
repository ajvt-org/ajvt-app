import { describe, it, expect } from "vitest";
import { activeCount, isInvitation, isMember, isRequest, seatKind } from "./teamInvites";

const row = (status: "PENDING" | "ACTIVE", invitedByCaptain = false) => ({
  status,
  invitedByCaptain,
});

describe("which way a seat on a team points", () => {
  it("calls an accepted seat a member, whoever started it", () => {
    expect(seatKind(row("ACTIVE"))).toBe("member");
    expect(seatKind(row("ACTIVE", true))).toBe("member");
  });

  it("calls a waiting seat the captain did not start a request", () => {
    expect(seatKind(row("PENDING"))).toBe("request");
    expect(isRequest(row("PENDING"))).toBe(true);
  });

  it("calls a waiting seat the captain started an invitation", () => {
    expect(seatKind(row("PENDING", true))).toBe("invitation");
    expect(isInvitation(row("PENDING", true))).toBe(true);
  });

  it("keeps the flag on an accepted seat as history rather than a direction", () => {
    expect(isInvitation(row("ACTIVE", true))).toBe(false);
    expect(isMember(row("ACTIVE", true))).toBe(true);
  });

  it("counts only the players who are in", () => {
    expect(activeCount([row("ACTIVE"), row("PENDING"), row("PENDING", true)])).toBe(1);
  });
});
