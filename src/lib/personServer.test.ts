import { describe, it, expect, vi } from "vitest";
import { syncPersonFromMember } from "./personServer";

const PERSON = {
  userId: "u1",
  fullName: "محمد ولد أحمد",
  age: "البدريين",
  village: "التاكلالت",
  photo: "photo.webp",
  memberNumber: "AJVT-2026-0001",
  verifyToken: "tok",
};

function stubDb(member: typeof PERSON | null) {
  const update = vi.fn().mockResolvedValue({});
  return {
    db: {
      member: { findUnique: vi.fn().mockResolvedValue(member) },
      user: { update },
    } as never,
    update,
  };
}

describe("syncPersonFromMember", () => {
  it("copies the person onto the account that holds them", async () => {
    const { db, update } = stubDb(PERSON);

    await syncPersonFromMember(db, "m1");

    expect(update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: {
        fullName: PERSON.fullName,
        age: PERSON.age,
        village: PERSON.village,
        photo: PERSON.photo,
        memberNumber: PERSON.memberNumber,
        verifyToken: PERSON.verifyToken,
      },
    });
  });

  it("never writes the member id onto the account", async () => {
    const { db, update } = stubDb(PERSON);

    await syncPersonFromMember(db, "m1");

    expect(update.mock.calls[0][0].data).not.toHaveProperty("userId");
  });

  it("does nothing for a member that is gone", async () => {
    const { db, update } = stubDb(null);

    await syncPersonFromMember(db, "missing");

    expect(update).not.toHaveBeenCalled();
  });
});
