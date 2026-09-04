import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExpenseDestinationsField from "./ExpenseDestinationsField";
import { expenseDestinations as texts } from "@/lib/texts";
import type { ExpenseShare } from "./types";
import type { DestinationOption } from "@/lib/moneyDestination";

const DESTINATIONS: DestinationOption[] = [
  { id: "a1", title: "نشاط أول", kind: "activity" },
  { id: "a2", title: "نشاط ثان", kind: "activity" },
  { id: "c1", title: "مسابقة", kind: "competition" },
];

function show(shares: ExpenseShare[], total: number) {
  const onChange = vi.fn();
  render(
    <ExpenseDestinationsField
      shares={shares}
      destinations={DESTINATIONS}
      total={total}
      onChange={onChange}
    />,
  );
  return onChange;
}

const one: ExpenseShare[] = [{ destinationId: "a1", amount: "" }];

describe("the common case, one destination", () => {
  it("asks for a destination and no amount", () => {
    show(one, 1000);

    expect(screen.queryByLabelText(texts.amountLabel(1))).toBeNull();
  });

  it("shows no running total to check", () => {
    show(one, 1000);

    expect(screen.queryByText(new RegExp(texts.total))).toBeNull();
  });

  it("offers no way to remove the only destination", () => {
    show(one, 1000);

    expect(screen.queryByLabelText(texts.remove(1))).toBeNull();
  });
});

describe("adding a second destination", () => {
  it("splits the amount evenly and gives the remainder to the earliest", async () => {
    const onChange = show(one, 1000);

    await userEvent.click(screen.getByRole("button", { name: new RegExp(texts.add) }));

    expect(onChange).toHaveBeenCalledWith([
      { destinationId: "a1", amount: "500" },
      { destinationId: "", amount: "500" },
    ]);
  });

  it("hands the odd unit to the first of three", async () => {
    const onChange = show(
      [
        { destinationId: "a1", amount: "500" },
        { destinationId: "a2", amount: "500" },
      ],
      1000,
    );

    await userEvent.click(screen.getByRole("button", { name: new RegExp(texts.add) }));

    expect(onChange).toHaveBeenCalledWith([
      { destinationId: "a1", amount: "334" },
      { destinationId: "a2", amount: "333" },
      { destinationId: "", amount: "333" },
    ]);
  });
});

describe("with several destinations", () => {
  const three: ExpenseShare[] = [
    { destinationId: "a1", amount: "334" },
    { destinationId: "a2", amount: "333" },
    { destinationId: "c1", amount: "333" },
  ];

  it("asks for an amount against each", () => {
    show(three, 1000);

    expect(screen.getByLabelText(texts.amountLabel(1))).toHaveProperty("value", "334");
    expect(screen.getByLabelText(texts.amountLabel(3))).toHaveProperty("value", "333");
  });

  it("says the total matches when it does", () => {
    show(three, 1000);

    expect(screen.getByText(texts.matches)).toBeDefined();
  });

  it("says by how much it falls short", () => {
    show([{ destinationId: "a1", amount: "200" }, ...three.slice(1)], 1000);

    expect(screen.getByText(texts.short(1000 - (200 + 333 + 333)))).toBeDefined();
  });

  it("says by how much it goes over", () => {
    show([{ destinationId: "a1", amount: "500" }, ...three.slice(1)], 1000);

    expect(screen.getByText(texts.over(500 + 333 + 333 - 1000))).toBeDefined();
  });

  it("drops back to a single destination with no amount when one is left", async () => {
    const onChange = show(
      [
        { destinationId: "a1", amount: "500" },
        { destinationId: "a2", amount: "500" },
      ],
      1000,
    );

    await userEvent.click(screen.getByLabelText(texts.remove(2)));

    expect(onChange).toHaveBeenCalledWith([{ destinationId: "a1", amount: "" }]);
  });

  it("keeps the rest when one of three is removed", async () => {
    const onChange = show(three, 1000);

    await userEvent.click(screen.getByLabelText(texts.remove(2)));

    expect(onChange).toHaveBeenCalledWith([
      { destinationId: "a1", amount: "334" },
      { destinationId: "c1", amount: "333" },
    ]);
  });
});
