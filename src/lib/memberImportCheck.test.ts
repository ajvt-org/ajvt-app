import { describe, it, expect } from "vitest";
import { members, memberImportRow, villages } from "./messages";
import { HOME_VILLAGE, OTHER_VILLAGE } from "./villages";
import { emptyCells, type ImportRow } from "./memberImportRow";
import {
  blockedCount,
  checkRows,
  isBlocked,
  type ExistingPerson,
  type ImportContext,
} from "./memberImportCheck";

const PAYMENT_METHODS = ["بنكيلي", "السداد", "مصرفي", "نقداً"];

const AGE = "البدريين";

const CONTEXT: ImportContext = {
  people: [],
  villageNames: ["بوغرابة"],
  ageGroupNames: [AGE, "الإتحاد"],
  membershipFee: 100,
  paymentMethods: PAYMENT_METHODS,
};

function row(
  cells: Partial<Record<keyof ReturnType<typeof emptyCells>, string>>,
  at = 1,
): ImportRow {
  return { row: at, cells: { ...emptyCells(), ...cells } };
}

function check(rows: ImportRow[], context: Partial<ImportContext> = {}) {
  return checkRows(rows, { ...CONTEXT, ...context });
}

function messages(rows: ReturnType<typeof check>, at = 0): string[] {
  return rows[at].issues.map((issue) => issue.message);
}

function person(over: Partial<ExistingPerson> = {}): ExistingPerson {
  return {
    id: "p1",
    fullName: "محمد ولد أحمد",
    phone: "36000123",
    village: HOME_VILLAGE,
    age: AGE,
    hasMembership: false,
    ...over,
  };
}

describe("checkRows, the fields", () => {
  it("accepts a complete row with nothing to say about it", () => {
    const checked = check([
      row({ fullName: "محمد ولد أحمد", phone: "36000123", village: HOME_VILLAGE, age: AGE }),
    ]);

    expect(checked[0].issues).toEqual([]);
    expect(isBlocked(checked[0])).toBe(false);
    expect(checked[0].values.village).toBe(HOME_VILLAGE);
  });

  it("blocks a row with no name", () => {
    const checked = check([row({ phone: "36000123", age: AGE })]);

    expect(messages(checked)).toContain(members.fullNameRequired);
    expect(isBlocked(checked[0])).toBe(true);
  });

  it("blocks a name past thirty characters", () => {
    const checked = check([row({ fullName: "م".repeat(31), age: AGE })]);

    expect(messages(checked)).toContain(members.fullNameTooLong);
  });

  it("defaults an absent village to the home village and then asks for the age group", () => {
    const checked = check([row({ fullName: "محمد" })]);

    expect(checked[0].values.village).toBe(HOME_VILLAGE);
    expect(messages(checked)).toContain(members.pickAgeGroup);
  });

  it("blocks a village nobody knows", () => {
    const checked = check([row({ fullName: "محمد", village: "قرية مجهولة" })]);

    expect(messages(checked)).toContain(villages.unknownVillage);
  });

  it("accepts a managed village and the other village without an age group", () => {
    const checked = check([
      row({ fullName: "محمد", village: "بوغرابة" }),
      row({ fullName: "أحمد", village: OTHER_VILLAGE }, 2),
    ]);

    expect(checked[0].issues).toEqual([]);
    expect(checked[1].issues).toEqual([]);
  });

  it("drops an age group given for a village that does not use one", () => {
    const checked = check([row({ fullName: "محمد", village: "بوغرابة", age: AGE })]);

    expect(checked[0].values.age).toBe("");
  });

  it("blocks an age group nobody knows", () => {
    const checked = check([row({ fullName: "محمد", age: "عصر مجهول" })]);

    expect(messages(checked)).toContain(memberImportRow.unknownAgeGroup);
  });

  it("blocks a phone that is not eight digits or starts wrong", () => {
    const checked = check([
      row({ fullName: "محمد", age: AGE, phone: "360001" }),
      row({ fullName: "أحمد", age: AGE, phone: "56000123" }, 2),
    ]);

    expect(isBlocked(checked[0])).toBe(true);
    expect(isBlocked(checked[1])).toBe(true);
  });

  it("keeps only the digits of a phone written with spaces or a country code marker", () => {
    const checked = check([row({ fullName: "محمد", age: AGE, phone: "36 00 01 23" })]);

    expect(checked[0].values.phone).toBe("36000123");
    expect(checked[0].issues).toEqual([]);
  });

  it("accepts a row with no phone at all", () => {
    const checked = check([row({ fullName: "محمد", age: AGE })]);

    expect(checked[0].values.phone).toBe("");
    expect(checked[0].issues).toEqual([]);
  });
});

describe("checkRows, the payment", () => {
  it("reads the paid column in either language", () => {
    const checked = check([
      row({ fullName: "أ", age: AGE, paid: "نعم", paymentMethod: "نقداً" }),
      row({ fullName: "ب", age: AGE, paid: "yes", paymentMethod: "نقداً" }, 2),
      row({ fullName: "ج", age: AGE, paid: "لا" }, 3),
      row({ fullName: "د", age: AGE, paid: "" }, 4),
    ]);

    expect(checked.map((r) => r.values.paid)).toEqual([true, true, false, false]);
  });

  it("reads a paid column it does not recognise as unpaid and says so", () => {
    const checked = check([row({ fullName: "أ", age: AGE, paid: "peut-etre" })]);

    expect(checked[0].values.paid).toBe(false);
    expect(checked[0].issues).toContainEqual(
      expect.objectContaining({ field: "paid", blocking: false }),
    );
  });

  it("says nothing about a paid column it does recognise", () => {
    const checked = check([row({ fullName: "أ", age: AGE, paid: "لا" })]);

    expect(checked[0].issues.filter((i) => i.field === "paid")).toEqual([]);
  });

  it("blocks a paid row with no payment method", () => {
    const checked = check([row({ fullName: "محمد", age: AGE, paid: "نعم" })]);

    expect(messages(checked)).toContain(members.pickPaymentMethod);
  });

  it("blocks a payment method that is not one of the four", () => {
    const checked = check([row({ fullName: "محمد", age: AGE, paid: "نعم", paymentMethod: "شيك" })]);

    expect(messages(checked)).toContain(memberImportRow.paymentMethodUnknown);
  });

  it("ignores the payment method on a row that is not paid", () => {
    const checked = check([row({ fullName: "محمد", age: AGE, paymentMethod: "شيك" })]);

    expect(checked[0].issues).toEqual([]);
  });

  it("blocks an amount below the fee and accepts one above it", () => {
    const checked = check([
      row({ fullName: "أ", age: AGE, paid: "نعم", paymentMethod: "نقداً", paidAmount: "50" }),
      row({ fullName: "ب", age: AGE, paid: "نعم", paymentMethod: "نقداً", paidAmount: "500" }, 2),
    ]);

    expect(isBlocked(checked[0])).toBe(true);
    expect(checked[1].issues).toEqual([]);
  });

  it("blocks an amount that is not a whole number", () => {
    const checked = check([
      row({ fullName: "محمد", age: AGE, paid: "نعم", paymentMethod: "نقداً", paidAmount: "abc" }),
    ]);

    expect(isBlocked(checked[0])).toBe(true);
  });

  it("reads the fee from the settings it is given rather than a constant", () => {
    const cells = {
      fullName: "محمد",
      age: AGE,
      paid: "نعم",
      paymentMethod: "نقداً",
      paidAmount: "150",
    };

    expect(isBlocked(check([row(cells)], { membershipFee: 100 })[0])).toBe(false);
    expect(isBlocked(check([row(cells)], { membershipFee: 200 })[0])).toBe(true);
  });
});

describe("checkRows, matching", () => {
  it("matches a phone against an existing account and calls it certain", () => {
    const checked = check([row({ fullName: "شخص آخر", age: AGE, phone: "36000123" })], {
      people: [person()],
    });

    expect(checked[0].match).toEqual({
      kind: "phone",
      personId: "p1",
      fullName: "محمد ولد أحمد",
      hasMembership: false,
    });
    expect(messages(checked)).toContain(memberImportRow.phoneOnAnotherAccount);
    expect(isBlocked(checked[0])).toBe(false);
  });

  it("matches a name only as a warning, never as proof", () => {
    const checked = check([row({ fullName: "محمد ولد أحمد", age: AGE })], {
      people: [person({ phone: null })],
    });

    expect(checked[0].match?.kind).toBe("name");
    expect(messages(checked)).toContain(memberImportRow.nameLooksExisting);
    expect(isBlocked(checked[0])).toBe(false);
  });

  it("does not call it a name match when the village or the age group differs", () => {
    const checked = check([row({ fullName: "محمد ولد أحمد", age: "الإتحاد" })], {
      people: [person({ phone: null })],
    });

    expect(checked[0].match).toBeNull();
  });

  it("prefers the phone match when both would fire", () => {
    const checked = check([row({ fullName: "محمد ولد أحمد", age: AGE, phone: "36000123" })], {
      people: [person()],
    });

    expect(checked[0].match?.kind).toBe("phone");
  });

  it("carries the membership the matched person holds, whether or not the row is paid", () => {
    const paid = check(
      [row({ fullName: "محمد", age: AGE, phone: "36000123", paid: "نعم", paymentMethod: "نقداً" })],
      { people: [person({ hasMembership: true })] },
    );
    const unpaid = check([row({ fullName: "محمد", age: AGE, phone: "36000123" })], {
      people: [person({ hasMembership: true })],
    });

    expect(paid[0].match?.hasMembership).toBe(true);
    expect(unpaid[0].match?.hasMembership).toBe(true);
  });
});

describe("checkRows, duplicates inside the file", () => {
  it("blocks the second row carrying a phone the file already used", () => {
    const checked = check([
      row({ fullName: "محمد", age: AGE, phone: "36000123" }),
      row({ fullName: "أحمد", age: AGE, phone: "36000123" }, 2),
    ]);

    expect(checked[0].issues).toEqual([]);
    expect(messages(checked, 1)).toContain(memberImportRow.phoneInFileTwice(1));
    expect(isBlocked(checked[1])).toBe(true);
  });

  it("only warns about a name the file already used, since people share names", () => {
    const checked = check([
      row({ fullName: "محمد ولد أحمد", age: AGE }),
      row({ fullName: "محمد ولد أحمد", age: AGE }, 2),
    ]);

    expect(messages(checked, 1)).toContain(memberImportRow.nameInFileTwice(1));
    expect(isBlocked(checked[1])).toBe(false);
  });

  it("counts the rows that cannot be imported until they are fixed", () => {
    const checked = check([
      row({ fullName: "محمد", age: AGE }),
      row({ fullName: "أحمد" }, 2),
      row({ village: "بوغرابة" }, 3),
    ]);

    expect(blockedCount(checked)).toBe(2);
  });
});
