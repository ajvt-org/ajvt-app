import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DestinationSelect from "./DestinationSelect";
import { destinationPicker } from "@/lib/texts";
import type { DestinationOption } from "@/lib/moneyDestination";

afterEach(cleanup);

const OPTIONS: DestinationOption[] = [
  { id: "a1", title: "بطولة الصيف", kind: "activity" },
  { id: "a2", title: "القافلة الصحية", kind: "activity" },
  { id: "c1", title: "مسابقة رمضان", kind: "competition" },
];

function show(over: Partial<Parameters<typeof DestinationSelect>[0]> = {}) {
  const onChange = vi.fn();
  const { container } = render(
    <DestinationSelect destinations={OPTIONS} value="" onChange={onChange} {...over} />,
  );
  return { onChange, container };
}

describe("the one picker for where money goes", () => {
  it("offers both kinds, grouped so the quiz is not read as a tournament", () => {
    const { container } = show();
    const groups = [...container.querySelectorAll("optgroup")];

    expect(groups.map((g) => g.getAttribute("label"))).toEqual([
      destinationPicker.activities,
      destinationPicker.competitions,
    ]);
    expect([...groups[0].querySelectorAll("option")].map((o) => o.textContent)).toEqual([
      "بطولة الصيف",
      "القافلة الصحية",
    ]);
    expect([...groups[1].querySelectorAll("option")].map((o) => o.textContent)).toEqual([
      "مسابقة رمضان",
    ]);
  });

  it("hands back the id that was picked, quiz or activity alike", async () => {
    const { onChange, container } = show();
    const select = container.querySelector("select") as HTMLSelectElement;

    await userEvent.selectOptions(select, "c1");
    expect(onChange).toHaveBeenCalledWith("c1");

    await userEvent.selectOptions(select, "a2");
    expect(onChange).toHaveBeenCalledWith("a2");
  });

  it("leads with the choice of no destination at all", () => {
    show();

    expect(screen.getByRole("option", { name: destinationPicker.general })).toBeTruthy();
  });

  it("takes a different word for no destination where the picker is a filter", () => {
    show({ emptyLabel: destinationPicker.anyDestination });

    expect(screen.getByRole("option", { name: destinationPicker.anyDestination })).toBeTruthy();
  });

  it("leaves out a group with nothing in it", () => {
    const { container } = show({ destinations: OPTIONS.filter((o) => o.kind === "activity") });

    expect([...container.querySelectorAll("optgroup")].map((g) => g.getAttribute("label"))).toEqual(
      [destinationPicker.activities],
    );
  });

  it("shows only the empty choice when nothing has been set up yet", () => {
    const { container } = show({ destinations: [] });

    expect(container.querySelectorAll("optgroup")).toHaveLength(0);
    expect(container.querySelectorAll("option")).toHaveLength(1);
  });
});
