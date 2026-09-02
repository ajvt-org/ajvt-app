import { describe, it, expect } from "vitest";
import { OWNER_ROLE, SUPER_ROLE } from "./adminRoles";
import {
  isDataset,
  memberRows,
  donationRows,
  ageRows,
  activityRows,
  MEMBER_HEADERS,
  DONATION_HEADERS,
  ACTIVITY_HEADERS,
  PLAIN_DATASETS,
} from "@/lib/exportRows";
import { HOME_VILLAGE } from "./villages";

describe("isDataset", () => {
  it("accepts every dataset the export route serves", () => {
    expect(["members", "donations", "ages", "activities"].every(isDataset)).toBe(true);
  });

  it("refuses anything else", () => {
    expect(isDataset("admins")).toBe(false);
    expect(isDataset("")).toBe(false);
  });
});

describe("memberRows", () => {
  const member = {
    fullName: "محمد ولد أحمد",
    age: "البدريين",
    village: HOME_VILLAGE,
    paymentMethod: "بنكيلي",
    paidAmount: 100,
    status: "ACTIVE",
    memberNumber: "AJVT-2026-0001",
    referenceCode: "AJVT-12",
    createdAt: new Date("2026-03-04T09:30:00.000Z"),
    user: { phone: "22334455" },
  };

  it("lines up with its headers", () => {
    expect(memberRows([member])[0]).toHaveLength(MEMBER_HEADERS.length);
  });

  it("writes the village next to the age group", () => {
    const [row] = memberRows([member]);
    expect(row[2]).toBe(HOME_VILLAGE);
    expect(row[3]).toBe("البدريين");
  });

  it("leaves the age group blank for a member outside the home village", () => {
    const [row] = memberRows([{ ...member, village: "أفجار", age: null }]);
    expect(row[2]).toBe("أفجار");
    expect(row[3]).toBe("");
  });

  it("writes the account phone and a plain day", () => {
    const [row] = memberRows([member]);
    expect(row[1]).toBe("22334455");
    expect(row[11]).toBe("2026-03-04");
  });

  it("survives a member with no account and nothing paid", () => {
    const [row] = memberRows([
      { ...member, user: null, paidAmount: null, memberNumber: null, referenceCode: null },
    ]);
    expect(row[1]).toBe("");
    expect(row[5]).toBe(0);
    expect(row[9]).toBe("");
  });

  it("writes the status in arabic", () => {
    expect(memberRows([{ ...member, status: "PENDING" }])[0][8]).toBe("قيد الانتظار");
  });

  it("splits the fee from the support and totals them", () => {
    const [row] = memberRows([{ ...member, paidAmount: 100, supportAmount: 2000 }]);
    expect(row.slice(5, 8)).toEqual([100, 2000, 2100]);
  });

  it("shows no support for a member who paid only the fee", () => {
    const [row] = memberRows([{ ...member, paidAmount: 100 }]);
    expect(row.slice(5, 8)).toEqual([100, 0, 100]);
  });
});

describe("donationRows", () => {
  const donation = {
    donorName: "أحمد",
    donorPhone: "22001122",
    amount: 500,
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    source: "PUBLIC",
    createdAt: new Date("2026-03-04T09:30:00.000Z"),
    userId: "u1",
    user: { fullName: "محمد", supportNameConfidential: false },
    tags: [{ name: "القافلة الصحية" }, { name: "مصاريف عامة" }],
  };
  const confidential = {
    ...donation,
    donorName: "الكريم",
    userId: "u2",
    user: { fullName: "الكريم", supportNameConfidential: true },
  };
  const ADMIN = { role: SUPER_ROLE };
  const OWNER = { role: OWNER_ROLE };

  it("lines up with its headers", () => {
    expect(donationRows([donation], ADMIN)[0]).toHaveLength(DONATION_HEADERS.length);
  });

  it("joins the tags into one cell", () => {
    expect(donationRows([donation], ADMIN)[0][7]).toBe("القافلة الصحية / مصاريف عامة");
  });

  it("names an anonymous giver rather than leaving it blank", () => {
    expect(
      donationRows([{ ...donation, donorName: null, userId: null, user: null }], ADMIN)[0][0],
    ).toBe("فاعل خير");
  });

  it("exports the account name over the name typed onto a linked gift", () => {
    expect(donationRows([{ ...donation, donorName: "ابو" }], ADMIN)[0][0]).toBe("محمد");
  });

  it("exports neither the name, the phone nor the linked account of a confidential giver", () => {
    const row = donationRows([confidential], ADMIN)[0];

    expect(row[0]).toBe("فاعل خير");
    expect(row[1]).toBe("");
    expect(row[6]).toBe("");
  });

  it("keeps his amount in the export", () => {
    expect(donationRows([confidential], ADMIN)[0][2]).toBe(500);
  });

  it("exports his name for the role that holds the promise", () => {
    expect(donationRows([confidential], OWNER)[0][0]).toBe("الكريم");
  });
});

describe("ageRows", () => {
  it("writes the rate as a percentage", () => {
    const rows = ageRows([
      { rank: 1, name: "البدريين", members: 15, users: 18, total: 30, rate: 50, userRate: 60 },
    ]);
    expect(rows[0]).toEqual(["البدريين", 15, 30, "50%"]);
  });
});

describe("activityRows", () => {
  const row = {
    activityId: "a1",
    title: "بطولة الصيف",
    income: 900,
    spending: 400,
    balance: 500,
    incomeByTag: [{ tag: "دعم", amount: 900 }],
    spendingByTag: [
      { tag: "نقل", amount: 300 },
      { tag: "طعام", amount: 100 },
    ],
    receiptNumbers: ["0001", "0002"],
  };

  it("lays one row out under the headers it declares", () => {
    expect(activityRows([row])[0]).toHaveLength(ACTIVITY_HEADERS.length);
  });

  it("names a surplus, a deficit and a balanced activity", () => {
    const states = activityRows([row, { ...row, balance: -500 }, { ...row, balance: 0 }]).map(
      (r) => r[4],
    );

    expect(states).toEqual(["فائض", "عجز", "متعادل"]);
  });

  it("writes the spending tags and the receipts into one cell each", () => {
    const [made] = activityRows([row]);

    expect(made[5]).toBe("نقل 300 / طعام 100");
    expect(made[6]).toBe("0001 / 0002");
  });

  it("leaves the parameterless export list alone", () => {
    expect([...PLAIN_DATASETS]).toEqual(["members", "donations", "ages"]);
  });
});
