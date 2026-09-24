import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ElectionFields from "./ElectionFields";
import { toLocalInput } from "@/lib/localDateInput";
import { localMoment } from "@/lib/localDateInput";
import type { ElectionDraft } from "./electionTypes";

const draft: ElectionDraft = {
  title: "انتخاب رئيس الجمعية",
  hidden: true,
  startsAt: "2026-10-01T08:00:00.000Z",
  durationMinutes: 1440,
  allowBlank: true,
  shuffleCandidates: false,
  showResults: true,
};

function show(frozen = false, over: Partial<ElectionDraft> = {}) {
  return render(
    <ElectionFields draft={{ ...draft, ...over }} frozen={frozen} onChange={vi.fn()} />,
  );
}

const valueOf = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value;

describe("the election form while it can still be changed", () => {
  it("gives the title and the start each its own label", () => {
    show();

    expect(valueOf("عنوان الانتخاب")).toBe(draft.title);
    expect(valueOf("بداية التصويت")).toBe(toLocalInput(draft.startsAt));
  });

  it("offers the duration as a named span rather than a number of minutes", () => {
    show();

    expect(valueOf("مدة التصويت")).toBe("1440");
    expect(screen.getByRole("option", { name: "يوم" })).toBeTruthy();
  });

  it("asks for minutes only once the admin picks a span that is not offered", () => {
    show(false, { durationMinutes: 95 });

    expect(valueOf("المدة بالدقائق")).toBe("95");
  });

  it("labels every toggle, so nothing is an unlabelled switch", () => {
    show();

    for (const label of [
      "إخفاء الانتخاب",
      "السماح بالورقة البيضاء",
      "ترتيب عشوائي للمترشحين",
      "إظهار النتيجة بعد انتهاء التصويت",
    ]) {
      expect(screen.getByRole("switch", { name: label })).toBeTruthy();
    }
  });

  it("says when the vote closes, so the admin does not work it out", () => {
    show();

    expect(screen.getByText("ينتهي التصويت")).toBeTruthy();
    const close = localMoment("2026-10-02T08:00:00.000Z");
    expect(screen.getByText(close.date)).toBeTruthy();
    expect(screen.getByText(close.time)).toBeTruthy();
  });
});

describe("the election form once the vote has opened", () => {
  it("prints the frozen fields as text rather than drawing a dead control", () => {
    show(true);

    expect(screen.queryByLabelText("عنوان الانتخاب")).toBeNull();
    expect(screen.queryByLabelText("بداية التصويت")).toBeNull();
    expect(screen.queryByLabelText("مدة التصويت")).toBeNull();
    expect(screen.getByText(draft.title)).toBeTruthy();
    expect(screen.getByText(localMoment(draft.startsAt).date)).toBeTruthy();
    expect(screen.getByText("يوم")).toBeTruthy();
  });

  it("spells a duration nobody named in minutes rather than a bare number", () => {
    show(true, { durationMinutes: 95 });

    expect(screen.getByText("95 دقيقةً")).toBeTruthy();
  });

  it("draws a locked setting as a check or an X where the toggle was", () => {
    show(true, { allowBlank: true, shuffleCandidates: false });

    const blank = screen.getByRole("switch", { name: "السماح بالورقة البيضاء" });
    const shuffle = screen.getByRole("switch", { name: "ترتيب عشوائي للمترشحين" });
    expect(blank.tagName).toBe("SPAN");
    expect(blank.getAttribute("aria-checked")).toBe("true");
    expect(blank.getAttribute("aria-disabled")).toBe("true");
    expect(shuffle.getAttribute("aria-checked")).toBe("false");
    expect(screen.queryByText("نعم")).toBeNull();
    expect(screen.queryByText("لا")).toBeNull();
  });

  it("keeps the hidden setting on screen as a locked row", () => {
    show(true, { hidden: false });

    const hidden = screen.getByRole("switch", { name: "إخفاء الانتخاب" });
    expect(hidden.tagName).toBe("SPAN");
    expect(hidden.getAttribute("aria-checked")).toBe("false");
  });

  it("draws every setting in the same row, locked or not", () => {
    show(true);

    const rows = [
      "إخفاء الانتخاب",
      "السماح بالورقة البيضاء",
      "ترتيب عشوائي للمترشحين",
      "إظهار النتيجة بعد انتهاء التصويت",
    ].map((label) => screen.getByRole("switch", { name: label }).parentElement!.className);
    expect(new Set(rows).size).toBe(1);
  });

  it("leaves the result toggle live, since the committee still decides that", () => {
    show(true);

    expect(screen.getByRole("switch", { name: "إظهار النتيجة بعد انتهاء التصويت" })).toBeTruthy();
  });
});
