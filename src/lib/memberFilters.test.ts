import { describe, it, expect } from "vitest";
import type { FilterableMember, MemberFilters } from "./memberFilters";
import { HOME_VILLAGE, OTHER_VILLAGE } from "./villages";
import {
  ADMIN_ORIGIN,
  SELF_ORIGIN,
  NO_FILTERS,
  MEMBER_FILTER_KEYS,
  readFilters,
  writeFilters,
  activeFilterCount,
  matchesFilters,
  membershipYearsPresent,
  upToDate,
} from "./memberFilters";

const FEE = 100;
const MEMBERSHIP = { fee: FEE, year: 2026 };

function member(over: Partial<FilterableMember> = {}): FilterableMember {
  return {
    status: "ACTIVE",
    endedAt: null,
    fullName: "محمد ولد أحمد",
    referenceCode: "AJVT-12",
    age: "البدريين",
    village: HOME_VILLAGE,
    paymentMethod: "بنكيلي",
    paidAmount: 100,
    membershipYear: 2026,
    user: { phone: "22334455" },
    ...over,
  };
}

describe("carrying the filters in the address", () => {
  it("reads an empty query as no opinion at all", () => {
    expect(readFilters(new URLSearchParams())).toEqual(NO_FILTERS);
  });

  it("writes nothing for the default view", () => {
    expect(writeFilters(NO_FILTERS).toString()).toBe("");
  });

  it("writes only what was chosen", () => {
    const params = writeFilters({ ...NO_FILTERS, status: "PENDING", age: "البدريين" });
    expect(params.get("status")).toBe("PENDING");
    expect(params.get("age")).toBe("البدريين");
    expect(params.get("method")).toBeNull();
  });

  it("survives a round trip, which is what a shared link is", () => {
    const chosen = {
      status: "REJECTED",
      q: "محمد",
      age: "التائبين",
      village: "أفجار",
      method: "نقداً",
      paid: "partial",
      year: "2026",
      standing: "former",
      from: "2026-03-01",
      to: "2026-03-31",
      origin: "admin",
      recorder: "a1",
      nophone: "yes",
      nocapture: "yes",
    };
    expect(readFilters(new URLSearchParams(writeFilters(chosen).toString()))).toEqual(chosen);
  });

  it("reads the retired standing names from an old link as the new ones", () => {
    expect(readFilters(new URLSearchParams("standing=paid")).standing).toBe("current");
    expect(readFilters(new URLSearchParams("standing=behind")).standing).toBe("former");
  });

  it("leaves the page out, the list url state hook owns it", () => {
    expect(writeFilters({ ...NO_FILTERS, status: "PENDING" }).get("page")).toBeNull();
  });

  it("names every filter it reads and writes", () => {
    expect([...MEMBER_FILTER_KEYS]).toEqual([
      "status",
      "q",
      "age",
      "village",
      "method",
      "paid",
      "year",
      "standing",
      "from",
      "to",
      "origin",
      "recorder",
      "nophone",
      "nocapture",
    ]);
    expect(Object.keys(NO_FILTERS).sort()).toEqual([...MEMBER_FILTER_KEYS].sort());
  });

  it("writes every filter it was given and reads it back", () => {
    const every = Object.fromEntries(
      MEMBER_FILTER_KEYS.map((key) => [key, key === "origin" ? ADMIN_ORIGIN : `v-${key}`]),
    ) as MemberFilters;
    const params = writeFilters(every);
    for (const key of MEMBER_FILTER_KEYS) expect(params.get(key)).toBe(every[key]);
    expect(readFilters(params)).toEqual(every);
  });

  it("drops the two narrowings from a link that did not ask for admin entered rows", () => {
    const read = readFilters(new URLSearchParams("nophone=yes&nocapture=yes"));

    expect(read.origin).toBe("");
    expect(read.nophone).toBe("");
    expect(read.nocapture).toBe("");
  });

  it("counts what is narrowing the list, for the clear button", () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...NO_FILTERS, status: "PENDING", paid: "none" })).toBe(2);
    expect(activeFilterCount({ ...NO_FILTERS, q: "   " })).toBe(0);
  });
});

describe("narrowing a list of members", () => {
  it("keeps everyone when nothing is chosen", () => {
    expect(matchesFilters(member(), NO_FILTERS, MEMBERSHIP)).toBe(true);
  });

  it("combines criteria rather than replacing them", () => {
    const filters = { ...NO_FILTERS, status: "ACTIVE", age: "البدريين", method: "بنكيلي" };
    expect(matchesFilters(member(), filters, MEMBERSHIP)).toBe(true);
    expect(matchesFilters(member({ paymentMethod: "نقداً" }), filters, MEMBERSHIP)).toBe(false);
    expect(matchesFilters(member({ status: "PENDING" }), filters, MEMBERSHIP)).toBe(false);
    expect(matchesFilters(member({ age: "التائبين" }), filters, MEMBERSHIP)).toBe(false);
  });

  it("narrows the list to one village", () => {
    const filters = { ...NO_FILTERS, village: "أفجار" };
    expect(matchesFilters(member({ village: "أفجار", age: null }), filters, MEMBERSHIP)).toBe(true);
    expect(matchesFilters(member(), filters, MEMBERSHIP)).toBe(false);
  });

  it("finds the members who picked the other option, so an admin can correct them", () => {
    const filters = { ...NO_FILTERS, village: OTHER_VILLAGE };
    expect(matchesFilters(member({ village: OTHER_VILLAGE, age: null }), filters, MEMBERSHIP)).toBe(
      true,
    );
    expect(matchesFilters(member(), filters, MEMBERSHIP)).toBe(false);
  });

  it("keeps a member with no age group when no age group is asked for", () => {
    expect(matchesFilters(member({ age: null }), NO_FILTERS, MEMBERSHIP)).toBe(true);
    expect(
      matchesFilters(member({ age: null }), { ...NO_FILTERS, age: "البدريين" }, MEMBERSHIP),
    ).toBe(false);
  });

  it("tells a part payment from a full one", () => {
    const partial = { ...NO_FILTERS, paid: "partial" };
    expect(matchesFilters(member({ paidAmount: 50 }), partial, MEMBERSHIP)).toBe(true);
    expect(matchesFilters(member({ paidAmount: 100 }), partial, MEMBERSHIP)).toBe(false);
    expect(matchesFilters(member({ paidAmount: 0 }), partial, MEMBERSHIP)).toBe(false);
  });

  it("counts a missing amount as nothing paid", () => {
    expect(
      matchesFilters(member({ paidAmount: null }), { ...NO_FILTERS, paid: "none" }, MEMBERSHIP),
    ).toBe(true);
  });

  it("treats more than the fee as paid in full", () => {
    expect(
      matchesFilters(member({ paidAmount: 500 }), { ...NO_FILTERS, paid: "full" }, MEMBERSHIP),
    ).toBe(true);
  });

  it("searches the name, the account number and the reference", () => {
    const q = (text: string) => ({ ...NO_FILTERS, q: text });
    expect(matchesFilters(member(), q("محمد"), MEMBERSHIP)).toBe(true);
    expect(matchesFilters(member(), q("2233"), MEMBERSHIP)).toBe(true);
    expect(matchesFilters(member(), q("ajvt-12"), MEMBERSHIP)).toBe(true);
    expect(matchesFilters(member({ user: { phone: "49999999" } }), q("4999"), MEMBERSHIP)).toBe(
      true,
    );
    expect(matchesFilters(member({ user: null }), q("2233"), MEMBERSHIP)).toBe(false);
    expect(matchesFilters(member(), q("لا يوجد"), MEMBERSHIP)).toBe(false);
  });
});

describe("narrowing to a period", () => {
  const joined = (createdAt: string) => member({ createdAt });

  it("keeps everyone when no period is chosen", () => {
    expect(matchesFilters(joined("2026-03-04T09:00:00.000Z"), NO_FILTERS, MEMBERSHIP)).toBe(true);
  });

  it("includes both ends of the range", () => {
    const range = { ...NO_FILTERS, from: "2026-03-01", to: "2026-03-31" };
    expect(matchesFilters(joined("2026-03-01T00:00:00.000Z"), range, MEMBERSHIP)).toBe(true);
    expect(matchesFilters(joined("2026-03-31T23:59:00.000Z"), range, MEMBERSHIP)).toBe(true);
  });

  it("drops what falls outside", () => {
    const range = { ...NO_FILTERS, from: "2026-03-01", to: "2026-03-31" };
    expect(matchesFilters(joined("2026-02-28T12:00:00.000Z"), range, MEMBERSHIP)).toBe(false);
    expect(matchesFilters(joined("2026-04-01T00:00:00.000Z"), range, MEMBERSHIP)).toBe(false);
  });

  it("takes an open-ended range from either side", () => {
    expect(
      matchesFilters(
        joined("2026-05-09T12:00:00.000Z"),
        { ...NO_FILTERS, from: "2026-05-01" },
        MEMBERSHIP,
      ),
    ).toBe(true);
    expect(
      matchesFilters(
        joined("2026-04-09T12:00:00.000Z"),
        { ...NO_FILTERS, from: "2026-05-01" },
        MEMBERSHIP,
      ),
    ).toBe(false);
    expect(
      matchesFilters(
        joined("2026-04-09T12:00:00.000Z"),
        { ...NO_FILTERS, to: "2026-05-01" },
        MEMBERSHIP,
      ),
    ).toBe(true);
  });

  it("counts each end as its own active filter", () => {
    expect(activeFilterCount({ ...NO_FILTERS, from: "2026-03-01" })).toBe(1);
    expect(activeFilterCount({ ...NO_FILTERS, from: "2026-03-01", to: "2026-03-31" })).toBe(2);
  });

  it("carries the period in the address", () => {
    const params = writeFilters({ ...NO_FILTERS, from: "2026-03-01", to: "2026-03-31" });
    expect(params.get("from")).toBe("2026-03-01");
    expect(params.get("to")).toBe("2026-03-31");
    expect(readFilters(params)).toMatchObject({ from: "2026-03-01", to: "2026-03-31" });
  });
});

describe("membership standing", () => {
  const thisYear = member({ status: "ACTIVE", membershipYear: 2026, paidAmount: 100 });
  const lastYear = member({ status: "ACTIVE", membershipYear: 2025, paidAmount: 100 });
  const partial = member({ status: "ACTIVE", membershipYear: 2026, paidAmount: 40 });

  it("counts a member as current by the year alone, whatever the amount", () => {
    const current = { ...NO_FILTERS, standing: "current" };
    expect(matchesFilters(thisYear, current, MEMBERSHIP)).toBe(true);
    expect(matchesFilters(partial, current, MEMBERSHIP)).toBe(true);
    expect(matchesFilters(lastYear, current, MEMBERSHIP)).toBe(false);
  });

  it("puts an unrenewed year in former, which is the list a renewal drive works from", () => {
    const former = { ...NO_FILTERS, standing: "former" };
    expect(matchesFilters(thisYear, former, MEMBERSHIP)).toBe(false);
    expect(matchesFilters(partial, former, MEMBERSHIP)).toBe(false);
    expect(matchesFilters(lastYear, former, MEMBERSHIP)).toBe(true);
  });

  it("counts against the active members, since the others are not members yet", () => {
    const members = [thisYear, lastYear, partial, member({ status: "PENDING", paidAmount: 100 })];
    expect(upToDate(members, MEMBERSHIP)).toEqual({ current: 2, active: 3 });
  });

  it("leaves a membership an admin ended out of both counts", () => {
    const ended = member({ membershipYear: 2026, endedAt: "2026-06-01T00:00:00.000Z" });
    const endedLastYear = member({ membershipYear: 2025, endedAt: "2025-06-01T00:00:00.000Z" });

    expect(upToDate([thisYear, lastYear, ended, endedLastYear], MEMBERSHIP)).toEqual({
      current: 1,
      active: 2,
    });
  });
});

describe("the years a list actually holds", () => {
  it("lists them newest first, without repeats", () => {
    const members = [2025, 2026, 2025, 2024].map((membershipYear) => member({ membershipYear }));
    expect(membershipYearsPresent(members)).toEqual([2026, 2025, 2024]);
  });
});

describe("narrowing to the memberships an admin recorded", () => {
  const on = (over: Partial<MemberFilters> = {}) => ({ ...NO_FILTERS, ...over });
  const byAdmin = (over: Partial<FilterableMember> = {}) =>
    member({ recordedByAdmin: true, paymentProof: "slip.webp", ...over });
  const bySelf = (over: Partial<FilterableMember> = {}) =>
    member({ recordedByAdmin: false, paymentProof: "slip.webp", ...over });

  it("keeps every membership when no origin was asked for", () => {
    expect(matchesFilters(bySelf(), on(), MEMBERSHIP)).toBe(true);
  });

  it("keeps a membership an admin recorded", () => {
    expect(matchesFilters(byAdmin(), on({ origin: ADMIN_ORIGIN }), MEMBERSHIP)).toBe(true);
  });

  it("drops a membership the member signed up for themselves", () => {
    expect(matchesFilters(bySelf(), on({ origin: ADMIN_ORIGIN }), MEMBERSHIP)).toBe(false);
  });

  it("narrows again to the ones with no phone number", () => {
    const filters = on({ origin: ADMIN_ORIGIN, nophone: "yes" });

    expect(matchesFilters(byAdmin({ user: { phone: null } }), filters, MEMBERSHIP)).toBe(true);
    expect(matchesFilters(byAdmin(), filters, MEMBERSHIP)).toBe(false);
  });

  it("narrows again to the ones with no payment capture", () => {
    const filters = on({ origin: ADMIN_ORIGIN, nocapture: "yes" });

    expect(matchesFilters(byAdmin({ paymentProof: null }), filters, MEMBERSHIP)).toBe(true);
    expect(matchesFilters(byAdmin(), filters, MEMBERSHIP)).toBe(false);
  });

  it("narrows a set of the first, never a set of its own", () => {
    const filters = on({ origin: ADMIN_ORIGIN, nocapture: "yes" });

    expect(matchesFilters(bySelf({ paymentProof: null }), filters, MEMBERSHIP)).toBe(false);
  });

  it("counts the origin and each narrowing", () => {
    expect(activeFilterCount(on({ origin: ADMIN_ORIGIN }))).toBe(1);
    expect(activeFilterCount(on({ origin: ADMIN_ORIGIN, nophone: "yes", nocapture: "yes" }))).toBe(
      3,
    );
  });

  it("keeps a membership the member filled in themselves", () => {
    expect(matchesFilters(bySelf(), on({ origin: SELF_ORIGIN }), MEMBERSHIP)).toBe(true);
  });

  it("drops a membership an admin recorded", () => {
    expect(matchesFilters(byAdmin(), on({ origin: SELF_ORIGIN }), MEMBERSHIP)).toBe(false);
  });

  it("puts a membership with no payment row on the admin side", () => {
    const noPayment = member({ recordedByAdmin: true, paymentProof: null });

    expect(matchesFilters(noPayment, on({ origin: ADMIN_ORIGIN }), MEMBERSHIP)).toBe(true);
    expect(matchesFilters(noPayment, on({ origin: SELF_ORIGIN }), MEMBERSHIP)).toBe(false);
  });

  it("splits the list in two, with nothing in both halves and nothing in neither", () => {
    const members = [byAdmin(), bySelf(), byAdmin({ user: { phone: null } }), bySelf()];
    const admin = members.filter((m) =>
      matchesFilters(m, on({ origin: ADMIN_ORIGIN }), MEMBERSHIP),
    );
    const self = members.filter((m) => matchesFilters(m, on({ origin: SELF_ORIGIN }), MEMBERSHIP));

    expect(admin.length + self.length).toBe(members.length);
    expect(admin.some((m) => self.includes(m))).toBe(false);
  });

  it("counts the self origin as one filter", () => {
    expect(activeFilterCount(on({ origin: SELF_ORIGIN }))).toBe(1);
  });

  it("carries the self origin through the address", () => {
    const params = writeFilters(on({ origin: SELF_ORIGIN }));

    expect(params.get("origin")).toBe(SELF_ORIGIN);
    expect(readFilters(params).origin).toBe(SELF_ORIGIN);
  });

  it("drops the two narrowings from a link asking for the self origin", () => {
    const read = readFilters(new URLSearchParams("origin=self&nophone=yes&nocapture=yes"));

    expect(read.origin).toBe(SELF_ORIGIN);
    expect(read.nophone).toBe("");
    expect(read.nocapture).toBe("");
  });

  it("ignores an origin it does not know", () => {
    expect(readFilters(new URLSearchParams("origin=whoever")).origin).toBe("");
  });
});

describe("narrowing to the memberships one named admin recorded", () => {
  const on = (over: Partial<MemberFilters> = {}) => ({ ...NO_FILTERS, ...over });
  const byAdmin = (over: Partial<FilterableMember> = {}) =>
    member({ recordedByAdmin: true, paymentProof: "slip.webp", ...over });

  it("keeps only the memberships that admin recorded", () => {
    const filters = on({ origin: ADMIN_ORIGIN, recorder: "a1" });

    expect(matchesFilters(byAdmin({ recordedByAdminId: "a1" }), filters, MEMBERSHIP)).toBe(true);
    expect(matchesFilters(byAdmin({ recordedByAdminId: "a2" }), filters, MEMBERSHIP)).toBe(false);
  });

  it("drops a membership no admin id was written onto", () => {
    const filters = on({ origin: ADMIN_ORIGIN, recorder: "a1" });

    expect(matchesFilters(byAdmin({ recordedByAdminId: null }), filters, MEMBERSHIP)).toBe(false);
  });

  it("keeps every admin recorded membership when no admin was named", () => {
    const filters = on({ origin: ADMIN_ORIGIN });

    expect(matchesFilters(byAdmin({ recordedByAdminId: "a1" }), filters, MEMBERSHIP)).toBe(true);
    expect(matchesFilters(byAdmin({ recordedByAdminId: null }), filters, MEMBERSHIP)).toBe(true);
  });

  it("carries the named admin through the address", () => {
    const params = writeFilters(on({ origin: ADMIN_ORIGIN, recorder: "a1" }));

    expect(params.get("recorder")).toBe("a1");
    expect(readFilters(params).recorder).toBe("a1");
  });

  it("drops the named admin from a link that did not ask for admin entered rows", () => {
    expect(readFilters(new URLSearchParams("recorder=a1")).recorder).toBe("");
    expect(readFilters(new URLSearchParams("origin=self&recorder=a1")).recorder).toBe("");
  });

  it("counts the named admin as a filter of its own", () => {
    expect(activeFilterCount(on({ origin: ADMIN_ORIGIN }))).toBe(1);
    expect(activeFilterCount(on({ origin: ADMIN_ORIGIN, recorder: "a1" }))).toBe(2);
  });
});
