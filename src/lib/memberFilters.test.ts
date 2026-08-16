import { describe, it, expect } from "vitest";
import type { FilterableMember } from "./memberFilters";
import {
  NO_FILTERS,
  readFilters,
  writeFilters,
  activeFilterCount,
  matchesFilters,
} from "./memberFilters";

const FEE = 100;

function member(over: Partial<FilterableMember> = {}): FilterableMember {
  return {
    status: "ACTIVE",
    fullName: "محمد ولد أحمد",
    referenceCode: "AJVT-12",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    paidAmount: 100,
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
      method: "نقداً",
      paid: "partial",
    };
    expect(readFilters(new URLSearchParams(writeFilters(chosen).toString()))).toEqual(chosen);
  });

  it("keeps the page only once it is past the first", () => {
    expect(writeFilters(NO_FILTERS, 1).get("page")).toBeNull();
    expect(writeFilters(NO_FILTERS, 3).get("page")).toBe("3");
  });

  it("counts what is narrowing the list, for the clear button", () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...NO_FILTERS, status: "PENDING", paid: "none" })).toBe(2);
    expect(activeFilterCount({ ...NO_FILTERS, q: "   " })).toBe(0);
  });
});

describe("narrowing a list of members", () => {
  it("keeps everyone when nothing is chosen", () => {
    expect(matchesFilters(member(), NO_FILTERS, FEE)).toBe(true);
  });

  it("combines criteria rather than replacing them", () => {
    const filters = { ...NO_FILTERS, status: "ACTIVE", age: "البدريين", method: "بنكيلي" };
    expect(matchesFilters(member(), filters, FEE)).toBe(true);
    expect(matchesFilters(member({ paymentMethod: "نقداً" }), filters, FEE)).toBe(false);
    expect(matchesFilters(member({ status: "PENDING" }), filters, FEE)).toBe(false);
    expect(matchesFilters(member({ age: "التائبين" }), filters, FEE)).toBe(false);
  });

  // The question that could not be asked before: accepted, but short.
  it("tells a part payment from a full one", () => {
    const partial = { ...NO_FILTERS, paid: "partial" };
    expect(matchesFilters(member({ paidAmount: 50 }), partial, FEE)).toBe(true);
    expect(matchesFilters(member({ paidAmount: 100 }), partial, FEE)).toBe(false);
    expect(matchesFilters(member({ paidAmount: 0 }), partial, FEE)).toBe(false);
  });

  it("counts a missing amount as nothing paid", () => {
    expect(matchesFilters(member({ paidAmount: null }), { ...NO_FILTERS, paid: "none" }, FEE)).toBe(
      true,
    );
  });

  it("treats more than the fee as paid in full", () => {
    expect(matchesFilters(member({ paidAmount: 500 }), { ...NO_FILTERS, paid: "full" }, FEE)).toBe(
      true,
    );
  });

  it("searches the name, the account number and the reference", () => {
    const q = (text: string) => ({ ...NO_FILTERS, q: text });
    expect(matchesFilters(member(), q("محمد"), FEE)).toBe(true);
    expect(matchesFilters(member(), q("2233"), FEE)).toBe(true);
    expect(matchesFilters(member(), q("ajvt-12"), FEE)).toBe(true);
    expect(matchesFilters(member({ user: { phone: "49999999" } }), q("4999"), FEE)).toBe(true);
    expect(matchesFilters(member({ user: null }), q("2233"), FEE)).toBe(false);
    expect(matchesFilters(member(), q("لا يوجد"), FEE)).toBe(false);
  });
});
