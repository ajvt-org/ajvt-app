import { describe, it, expect } from "vitest";
import {
  NEWEST_FIRST,
  OLDEST_FIRST,
  byRequestedDate,
  howRegistered,
  requestedOn,
} from "./registrationRecord";
import type { Registration } from "./activityTypes";

function registration(over: Partial<Registration> = {}): Registration {
  return {
    id: "r1",
    status: "ACTIVE",
    paymentProof: null,
    rejectionReason: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    source: null,
    recordedBy: null,
    team: null,
    member: { id: "u1", fullName: "محمد", phone: null, age: "البدريين", photo: null },
    ...over,
  };
}

describe("saying how somebody was registered", () => {
  it("says they did it themselves", () => {
    expect(howRegistered(registration({ source: "SELF" }))).toBe("سجّل نفسه");
  });

  it("names the admin who added them", () => {
    expect(howRegistered(registration({ source: "ADMIN", recordedBy: "مسؤول" }))).toBe(
      "أضافه مسؤول",
    );
  });

  it("says an admin added them when the record does not name one", () => {
    expect(howRegistered(registration({ source: "ADMIN" }))).toBe("أضافه مشرف");
  });

  it("says it does not know for a row written before the record existed", () => {
    expect(howRegistered(registration())).toBe("غير معروف");
  });

  it("does not guess that an unknown row was somebody's own doing", () => {
    expect(howRegistered(registration())).not.toBe("سجّل نفسه");
  });
});

describe("saying when the request arrived", () => {
  it("reads the day the row was created", () => {
    expect(requestedOn(registration({ createdAt: "2026-08-20T22:15:00.000Z" }))).toBe("2026-08-20");
  });
});

describe("ordering the registrants by when they asked", () => {
  const early = registration({ id: "early", createdAt: "2026-08-01T00:00:00.000Z" });
  const late = registration({ id: "late", createdAt: "2026-08-30T00:00:00.000Z" });

  it("puts the newest first by default", () => {
    expect(byRequestedDate([early, late], NEWEST_FIRST).map((r) => r.id)).toEqual([
      "late",
      "early",
    ]);
  });

  it("turns around when the oldest is asked for", () => {
    expect(byRequestedDate([early, late], OLDEST_FIRST).map((r) => r.id)).toEqual([
      "early",
      "late",
    ]);
  });

  it("leaves the rows it was handed alone", () => {
    const rows = [early, late];

    byRequestedDate(rows, OLDEST_FIRST);

    expect(rows.map((r) => r.id)).toEqual(["early", "late"]);
  });
});
