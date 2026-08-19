import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TutorialQuiz from "./TutorialQuiz";
import { TUTORIAL_QUESTIONS } from "@/lib/quizTutorial";

const [first, second, third] = TUTORIAL_QUESTIONS;

const pick = (text: string) => userEvent.click(screen.getByText(text));
const confirm = () => userEvent.click(screen.getByRole("button", { name: "تأكيد الإجابة" }));
const carryOn = (name: RegExp) => userEvent.click(screen.getByRole("button", { name }));

async function answerRight(question: (typeof TUTORIAL_QUESTIONS)[number]) {
  for (const id of question.correctIds) {
    await pick(question.options.find((o) => o.id === id)!.text);
  }
  await confirm();
}

describe("TutorialQuiz", () => {
  it("says the round is practice and does not count", () => {
    render(<TutorialQuiz onExit={() => {}} />);

    expect(screen.getByText(/لا تحتسب نقاطها/)).toBeDefined();
  });

  it("starts on the first question of three", () => {
    render(<TutorialQuiz onExit={() => {}} />);

    expect(screen.getByText(first.text)).toBeDefined();
    expect(screen.getByText("1 / 3")).toBeDefined();
  });

  it("tells the member a right answer was right", async () => {
    render(<TutorialQuiz onExit={() => {}} />);

    await answerRight(first);

    await waitFor(() => expect(screen.getByText("إجابة صحيحة")).toBeDefined());
    expect(screen.getByText("جولة تجريبية")).toBeDefined();
  });

  it("tells the member a wrong answer was wrong and pays nothing", async () => {
    render(<TutorialQuiz onExit={() => {}} />);

    await pick(first.options.find((o) => !first.correctIds.includes(o.id))!.text);
    await confirm();

    await waitFor(() => expect(screen.getByText("إجابة خاطئة")).toBeDefined());
    expect(screen.getByText(/مجموعك في الجولة 0/)).toBeDefined();
  });

  it("moves to the next question", async () => {
    render(<TutorialQuiz onExit={() => {}} />);
    await answerRight(first);
    await waitFor(() => screen.getByText("إجابة صحيحة"));

    await carryOn(/السؤال التالي/);

    await waitFor(() => expect(screen.getByText(second.text)).toBeDefined());
  });

  it("wants every right option of the last question", async () => {
    render(<TutorialQuiz onExit={() => {}} />);
    await answerRight(first);
    await carryOn(/السؤال التالي/);
    await answerRight(second);
    await carryOn(/السؤال التالي/);

    await waitFor(() => expect(screen.getByText(third.text)).toBeDefined());
    await pick(third.options.find((o) => o.id === third.correctIds[0])!.text);
    expect(
      (screen.getByRole("button", { name: "تأكيد الإجابة" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("ends by saying the score does not count", async () => {
    render(<TutorialQuiz onExit={() => {}} />);
    await answerRight(first);
    await carryOn(/السؤال التالي/);
    await answerRight(second);
    await carryOn(/السؤال التالي/);
    await answerRight(third);
    await carryOn(/إنهاء/);

    await waitFor(() => expect(screen.getByText(/أنهيت الجولة التجريبية/)).toBeDefined());
    expect(screen.getByText(/لا تحتسب في المسابقة/)).toBeDefined();
  });

  it("can be taken again from the start", async () => {
    render(<TutorialQuiz onExit={() => {}} />);
    await answerRight(first);
    await carryOn(/السؤال التالي/);
    await answerRight(second);
    await carryOn(/السؤال التالي/);
    await answerRight(third);
    await carryOn(/إنهاء/);
    await waitFor(() => screen.getByText(/أنهيت الجولة التجريبية/));

    await carryOn(/إعادة التجربة/);

    await waitFor(() => expect(screen.getByText(first.text)).toBeDefined());
    expect(screen.getByText("1 / 3")).toBeDefined();
  });

  it("hands the member back to the competition", async () => {
    const onExit = vi.fn();
    render(<TutorialQuiz onExit={onExit} />);
    await answerRight(first);
    await carryOn(/السؤال التالي/);
    await answerRight(second);
    await carryOn(/السؤال التالي/);
    await answerRight(third);
    await carryOn(/إنهاء/);
    await waitFor(() => screen.getByText(/أنهيت الجولة التجريبية/));

    await carryOn(/العودة للمسابقة/);

    expect(onExit).toHaveBeenCalled();
  });
});
