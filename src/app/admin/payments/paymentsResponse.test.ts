import { describe, it, expect, beforeEach, vi } from "vitest";
import { logger } from "@/lib/logger";
import { readDestinations, readFinanceTags, readMembers, readProofs } from "./paymentsResponse";

const ACCOUNT = { id: "a1", code: "BNM-1", label: "الحساب البنكي" };

const MEMBERSHIP_PROOF = {
  id: "u1",
  kind: "MEMBERSHIP",
  userId: "u1",
  proof: "proof.jpg",
  memberName: "الثالث",
  accountId: "a1",
  account: ACCOUNT,
  bankReference: "REF-1",
  repeatedReference: false,
  activityTitle: null,
  amount: null,
  status: "PENDING",
  paidOn: null,
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
  paidOn: null,
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
  accountId: "a1",
  account: ACCOUNT,
  bankReference: "REF-2",
  repeatedReference: true,
  userId: null,
  anonymous: false,
  donorName: "الأول",
  donorPhone: null,
  donorPhoto: null,
  tags: [],
  receipt: null,
  paidOn: "2026-08-30T00:00:00.000Z",
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

  it("keeps the account, the operation number and the repeat warning", () => {
    const [membership, donation] = readProofs({
      proofs: [MEMBERSHIP_PROOF, DONATION_PROOF],
    });

    expect(membership.accountId).toBe("a1");
    expect(membership.account).toEqual(ACCOUNT);
    expect(membership.bankReference).toBe("REF-1");
    expect(membership.repeatedReference).toBe(false);
    expect(donation.accountId).toBe("a1");
    expect(donation.account).toEqual(ACCOUNT);
    expect(donation.bankReference).toBe("REF-2");
    expect(donation.repeatedReference).toBe(true);
  });

  it("reads a row that names no account and carries no operation number", () => {
    const [row] = readProofs({
      proofs: [{ ...DONATION_PROOF, accountId: null, account: null, bankReference: null }],
    });

    expect(row.accountId).toBeNull();
    expect(row.account).toBeNull();
    expect(row.bankReference).toBeNull();
  });

  it("still reads an activity row, which names none of the four", () => {
    expect(readProofs({ proofs: [ACTIVITY_PROOF] })).toHaveLength(1);
  });

  it("keeps a row carrying a field the parser does not declare, and says so", () => {
    const spy = vi.spyOn(logger, "error");

    const proofs = readProofs({ proofs: [{ ...DONATION_PROOF, reviewedBy: "admin" }] });

    expect(proofs).toHaveLength(1);
    expect(spy).toHaveBeenCalledWith("payments.proofs.shape", {
      reason: "undeclared fields",
      fields: ["reviewedBy"],
    });
  });

  it("says nothing when every field the response carries is declared", () => {
    const spy = vi.spyOn(logger, "error");

    readProofs({ proofs: [MEMBERSHIP_PROOF, ACTIVITY_PROOF, DONATION_PROOF] });

    expect(spy).not.toHaveBeenCalled();
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
