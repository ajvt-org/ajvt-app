import { describe, it, expect } from "vitest";
import {
  isDataset,
  memberRows,
  donationRows,
  ageRows,
  MEMBER_HEADERS,
  DONATION_HEADERS,
} from "@/lib/exportRows";
import { HOME_VILLAGE } from "./villages";

describe("isDataset", () => {
  it("accepts the three the issue asks for", () => {
    expect(["members", "donations", "ages"].every(isDataset)).toBe(true);
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
    member: { user: { fullName: "محمد" } },
    tags: [{ name: "القافلة الصحية" }, { name: "مصاريف عامة" }],
  };

  it("lines up with its headers", () => {
    expect(donationRows([donation])[0]).toHaveLength(DONATION_HEADERS.length);
  });

  it("joins the tags into one cell", () => {
    expect(donationRows([donation])[0][7]).toBe("القافلة الصحية / مصاريف عامة");
  });

  it("names an anonymous giver rather than leaving it blank", () => {
    expect(donationRows([{ ...donation, donorName: null }])[0][0]).toBe("فاعل خير");
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
