import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LevelFields from "./LevelFields";
import { blankDraft } from "./levelDraft";
import type { LevelPlace } from "@/lib/seriesSetup";

const COUNTED_BY = "بم تُحسب الوحدات";
const RULES = "القاعدة";
const ENDS_BY = "متى ينتهي";
const UNIT_COUNT = "كم وحدة";
const UNSETTLED = "إن لم يُحسم";
const CREDIT = "الرصيد الابتدائي";

function show(place: LevelPlace, onChange = vi.fn()) {
  const draft = { ...blankDraft("a"), singular: "مباراة" };
  render(
    <LevelFields
      draft={draft}
      place={place}
      disabled={false}
      locked={false}
      fix={null}
      onChange={onChange}
    />,
  );
  return onChange;
}

const openRules = () => fireEvent.click(screen.getByRole("button", { name: RULES }));

describe("the fields of a level that is the whole ladder", () => {
  it("asks how the match is counted", () => {
    show("only");

    expect(screen.getByLabelText(COUNTED_BY)).toBeDefined();
  });

  it("asks it without folding one control away", () => {
    show("only");

    expect(screen.queryByRole("button", { name: RULES })).toBeNull();
  });

  it("asks nothing else, since the match is the unit", () => {
    show("only");

    expect(screen.queryByLabelText(ENDS_BY)).toBeNull();
    expect(screen.queryByLabelText(UNIT_COUNT)).toBeNull();
    expect(screen.queryByLabelText(UNSETTLED)).toBeNull();
    expect(screen.queryByLabelText(CREDIT)).toBeNull();
  });

  it("takes the choice of counting by points", () => {
    const onChange = show("only");

    fireEvent.change(screen.getByLabelText(COUNTED_BY), { target: { value: "POINTS" } });

    expect(onChange).toHaveBeenCalledWith({ countedBy: "POINTS" });
  });
});

describe("the fields of a level in a deeper ladder", () => {
  it("keeps the whole rules block on a level with one under it", () => {
    show("above");
    openRules();

    expect(screen.getByLabelText(COUNTED_BY)).toBeDefined();
    expect(screen.getByLabelText(ENDS_BY)).toBeDefined();
    expect(screen.getByLabelText(UNIT_COUNT)).toBeDefined();
    expect(screen.getByLabelText(UNSETTLED)).toBeDefined();
    expect(screen.getByLabelText(CREDIT)).toBeDefined();
  });

  it("offers nothing at all on the last level of a ladder of two", () => {
    show("last");

    expect(screen.queryByRole("button", { name: RULES })).toBeNull();
    expect(screen.queryByLabelText(COUNTED_BY)).toBeNull();
    expect(screen.queryByLabelText(ENDS_BY)).toBeNull();
  });
});
