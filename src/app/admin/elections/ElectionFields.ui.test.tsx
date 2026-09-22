import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ElectionFields from "./ElectionFields";
import { toLocalInput } from "@/lib/localDateInput";
import { formatDateTime } from "@/lib/clubTime";
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
    expect(screen.getByText(formatDateTime("2026-10-02T08:00:00.000Z"))).toBeTruthy();
  });
});

describe("the election form once the vote has opened", () => {
  it("prints the frozen fields as text rather than drawing a dead control", () => {
    show(true);

    expect(screen.queryByLabelText("عنوان الانتخاب")).toBeNull();
    expect(screen.queryByLabelText("بداية التصويت")).toBeNull();
    expect(screen.queryByLabelText("مدة التصويت")).toBeNull();
    expect(screen.getByText(draft.title)).toBeTruthy();
    expect(screen.getByText(formatDateTime(draft.startsAt))).toBeTruthy();
    expect(screen.getByText("يوم")).toBeTruthy();
  });

  it("spells a duration nobody named in minutes rather than a bare number", () => {
    show(true, { durationMinutes: 95 });

    expect(screen.getByText("95 دقيقةً")).toBeTruthy();
  });

  it("reads the frozen toggles back as words", () => {
    show(true, { allowBlank: true, shuffleCandidates: false });

    expect(screen.queryByRole("switch", { name: "السماح بالورقة البيضاء" })).toBeNull();
    expect(screen.queryByRole("switch", { name: "ترتيب عشوائي للمترشحين" })).toBeNull();
    expect(screen.getByText("نعم")).toBeTruthy();
    expect(screen.getByText("لا")).toBeTruthy();
  });

  it("leaves the result toggle live, since the committee still decides that", () => {
    show(true);

    expect(screen.getByRole("switch", { name: "إظهار النتيجة بعد انتهاء التصويت" })).toBeTruthy();
  });
});
