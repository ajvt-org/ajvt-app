import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CompetitionFields, { type Draft } from "./CompetitionFields";
import { toLocalInput } from "./competitionTypes";

const draft: Draft = {
  name: "مسابقة الصيف",
  startsAt: "2026-08-20T08:00:00.000Z",
  visibility: "PUBLIC",
  bankId: "general",
  roundCount: 31,
  roundPeriodMinutes: 1440,
  roundWindowMinutes: 842,
  servedCount: 13,
  categoryRounds: false,
  boards: [],
  fullSeconds: 14,
  maxSeconds: 35,
  floorPercent: 55,
};

function show(locked = false) {
  render(
    <CompetitionFields
      draft={draft}
      banks={[{ id: "general", name: "البنك العام" }]}
      locked={locked}
      onChange={vi.fn()}
    />,
  );
}

const valueOf = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value;

describe("the competition settings fields", () => {
  it("gives the first round start and the round count each its own label", () => {
    show();

    expect(valueOf("بداية الجولة الأولى")).toBe(toLocalInput(draft.startsAt));
    expect(valueOf("عدد الجولات")).toBe("31");
  });

  it("gives the round period and the round length each its own label", () => {
    show();

    expect(valueOf("جولة كل")).toBe(String(draft.roundPeriodMinutes));
    expect(valueOf("مدة الجولة بالدقائق")).toBe("842");
  });

  it("gives the two parts of the speed curve each its own label", () => {
    show();

    expect(valueOf("مهلة النقاط الكاملة بالثواني")).toBe("14");
    expect(valueOf("مدة السؤال بالثواني")).toBe("35");
  });

  it("keeps every field a label reaches disabled once the competition is locked", () => {
    show(true);

    for (const label of [
      "بداية الجولة الأولى",
      "عدد الجولات",
      "جولة كل",
      "مدة الجولة بالدقائق",
      "مهلة النقاط الكاملة بالثواني",
      "مدة السؤال بالثواني",
    ]) {
      expect((screen.getByLabelText(label) as HTMLInputElement).disabled).toBe(true);
    }
  });
});
