import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsForm from "./SettingsForm";
import { emptySettingsForm } from "./types";
import { quizSettingsForm as texts } from "@/lib/texts";

const setup = (onChange = vi.fn(), onSubmit = vi.fn(), onToggleConfirm = vi.fn()) => {
  render(
    <SettingsForm
      values={emptySettingsForm}
      confirmAnswers
      error=""
      saving={false}
      onChange={onChange}
      onToggleConfirm={onToggleConfirm}
      onSubmit={onSubmit}
    />,
  );
  return { onChange, onSubmit, onToggleConfirm };
};

describe("SettingsForm", () => {
  it("asks only what a new question needs", () => {
    setup();

    expect(screen.getByLabelText("عدد الإجابات الافتراضي")).toBeDefined();
    expect(screen.getByLabelText("عدد الإجابات الصحيحة الافتراضي")).toBeDefined();
    expect(screen.getByLabelText("النقاط الافتراضية للسؤال")).toBeDefined();
  });

  it("leaves the running of a competition to the competition", () => {
    setup();

    expect(screen.queryByLabelText(/عدد الأسئلة المرسلة يومياً/)).toBeNull();
    expect(screen.queryByLabelText(/مدة الإجابة بالثواني/)).toBeNull();
    expect(screen.queryByLabelText(/أقل نسبة للنقاط/)).toBeNull();
  });

  it("says where those settings live instead", () => {
    setup();

    expect(screen.getByText(/يضبط داخل المسابقة نفسها/)).toBeDefined();
  });

  it("heads the defaults, so the lead cannot read as more about the toggle", () => {
    setup();

    const heading = screen.getByText(texts.defaultsTitle).closest("p");
    const hint = screen.getByText(texts.confirmAnswersKeeps).closest("p");

    expect(heading?.className).toContain("font-bold");
    expect(hint?.className).not.toContain("font-bold");
    expect(heading?.compareDocumentPosition(hint!)).toBe(Node.DOCUMENT_POSITION_PRECEDING);
  });

  it("keeps only what the toggle label cannot say", () => {
    setup();

    expect(screen.getByText(texts.confirmAnswersKeeps)).toBeDefined();
    expect(texts.confirmAnswersKeeps).not.toContain("دون تأكيد");
  });

  it("keeps the points within the range a difficulty is read from", () => {
    setup();

    const points = screen.getByLabelText("النقاط الافتراضية للسؤال") as HTMLInputElement;
    expect(points.min).toBe("1");
    expect(points.max).toBe("20");
  });

  it("reports what was typed", async () => {
    const { onChange } = setup();

    await userEvent.type(screen.getByLabelText("النقاط الافتراضية للسؤال"), "2");

    expect(onChange).toHaveBeenCalledWith("defaultPoints", "102");
  });

  it("shows what the server refused", () => {
    render(
      <SettingsForm
        values={emptySettingsForm}
        confirmAnswers
        error="عدد الإجابات الصحيحة أكبر من عدد الإجابات"
        saving={false}
        onChange={() => {}}
        onToggleConfirm={() => {}}
        onSubmit={() => {}}
      />,
    );

    expect(screen.getByText(/عدد الإجابات الصحيحة أكبر/)).toBeDefined();
  });

  it("offers the confirm button toggle checked when it is on", () => {
    setup();

    const toggle = screen.getByLabelText("زر تأكيد الإجابة") as HTMLInputElement;
    expect(toggle.checked).toBe(true);
  });

  it("reports a flip of the confirm toggle", async () => {
    const { onToggleConfirm } = setup();

    await userEvent.click(screen.getByLabelText("زر تأكيد الإجابة"));

    expect(onToggleConfirm).toHaveBeenCalled();
  });
});
