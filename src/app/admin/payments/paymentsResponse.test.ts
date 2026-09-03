import { describe, it, expect, beforeEach, vi } from "vitest";
import { readDestinations, readFinanceTags, readMembers, readProofs } from "./paymentsResponse";

const MEMBERSHIP_PROOF = {
  id: "u1",
  kind: "MEMBERSHIP",
  userId: "u1",
  proof: "proof.jpg",
  memberName: "الثالث",
  activityTitle: null,
  amount: null,
  status: "PENDING",
  uploadedAt: "2026-08-31T03:12:08.330Z",
  submittedAt: "2026-08-31T03:12:08.330Z",
};

const ACTIVITY_PROOF = {
  id: "r1",
  kind: "ACTIVITY",
  userId: "u2",
  proof: "reg.jpg",
  memberName: "الثاني",
  activityTitle: "نشاط",
  amount: null,
  status: "PENDING",
  uploadedAt: "2026-08-31T03:12:08.386Z",
  submittedAt: "2026-08-31T03:12:08.386Z",
};

const DONATION_PROOF = {
  id: "d1",
  kind: "DONATION",
  proof: "don.jpg",
  memberName: "الأول",
  activityId: null,
  activityTitle: null,
  amount: 300,
  status: "ACTIVE",
  source: "PUBLIC",
  paymentMethod: null,
  userId: null,
  anonymous: false,
  donorName: "الأول",
  donorPhone: null,
  donorPhoto: null,
  tags: [],
  receipt: null,
  uploadedAt: "2026-08-31T03:12:08.416Z",
  submittedAt: "2026-08-31T03:12:08.416Z",
};

const MEMBER_ROW = {
  id: "u1",
  userId: "u1",
  fullName: "الثالث للاختبار",
  memberNumber: "T-003",
  village: "لكصيبة",
  age: "41",
  photo: null,
  photoLocked: false,
  verifyToken: null,
  membershipYear: 2026,
  status: "PENDING",
  paymentMethod: null,
  paymentProof: "proof.jpg",
  referenceCode: null,
  rejectionReason: null,
  registrations: [],
  paidAmount: null,
  supportAmount: 0,
  createdAt: "2026-08-31T03:12:08.330Z",
  updatedAt: "2026-08-31T03:12:08.330Z",
  user: { phone: "20000003" },
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("the members the payments screen loads", () => {
  it("keeps the account id and lifts the phone off the account", () => {
    expect(readMembers({ members: [MEMBER_ROW] })).toEqual([
      {
        id: "u1",
        userId: "u1",
        fullName: "الثالث للاختبار",
        memberNumber: "T-003",
        phone: "20000003",
        village: "لكصيبة",
        age: "41",
        photo: null,
      },
    ]);
  });

  it("takes nobody from a response that leaves the account id out", () => {
    const { userId, ...withoutAccount } = MEMBER_ROW;
    void userId;

    expect(readMembers({ members: [withoutAccount] })).toEqual([]);
  });

  it("takes nobody from a response that never arrived", () => {
    expect(readMembers(null)).toEqual([]);
  });

  it("reads a member who has no account phone", () => {
    expect(readMembers({ members: [{ ...MEMBER_ROW, user: null }] })[0].phone).toBeNull();
  });
});

describe("the payments the screen loads", () => {
  it("reads all three kinds, keeping the account each one names", () => {
    const proofs = readProofs({
      proofs: [MEMBERSHIP_PROOF, ACTIVITY_PROOF, DONATION_PROOF],
    });

    expect(proofs.map((p) => p.userId)).toEqual(["u1", "u2", null]);
  });

  it("drops a row missing a field the card reads", () => {
    const { memberName, ...withoutName } = DONATION_PROOF;
    void memberName;

    expect(readProofs({ proofs: [withoutName] })).toEqual([]);
  });

  it("keeps the rows that fit when one of them does not", () => {
    const { memberName, ...withoutName } = DONATION_PROOF;
    void memberName;

    const proofs = readProofs({
      proofs: [DONATION_PROOF, withoutName, { ...DONATION_PROOF, id: "d2" }],
    });

    expect(proofs.map((p) => p.id)).toEqual([DONATION_PROOF.id, "d2"]);
  });

  it("takes nothing from a response that never arrived", () => {
    expect(readProofs(null)).toEqual([]);
  });
});

describe("the rest of what the screen loads", () => {
  it("reads both kinds of destination and the tags", () => {
    expect(
      readDestinations({
        destinations: [
          { id: "a1", title: "نشاط", kind: "activity" },
          { id: "c1", title: "مسابقة", kind: "competition" },
        ],
      }),
    ).toEqual([
      { id: "a1", title: "نشاط", kind: "activity" },
      { id: "c1", title: "مسابقة", kind: "competition" },
    ]);
    expect(readFinanceTags({ tags: [{ id: "t1", name: "تصنيف" }] })).toEqual([
      { id: "t1", name: "تصنيف" },
    ]);
  });

  it("takes nothing from responses that never arrived", () => {
    expect(readDestinations(null)).toEqual([]);
    expect(readFinanceTags(null)).toEqual([]);
  });
});
