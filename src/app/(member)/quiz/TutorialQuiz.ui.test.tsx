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

async function playAll() {
  await answerRight(first);
  await waitFor(() => screen.getByText(second.text));
  await answerRight(second);
  await waitFor(() => screen.getByText(third.text));
  await answerRight(third);
}

describe("TutorialQuiz", () => {
  it("says the round is practice and does not count", () => {
    render(<TutorialQuiz onExit={() => {}} />);

    expect(screen.getByText(/لا تحتسب نقاطها/)).toBeDefined();
  });

  it("starts on the first question of three", () => {
    render(<TutorialQuiz onExit={() => {}} />);

    expect(screen.getByText(first.text)).toBeDefined();
    expect(screen.getByText(/1 \/ 3/)).toBeDefined();
  });

  it("goes straight to the next question when an answer is confirmed", async () => {
    render(<TutorialQuiz onExit={() => {}} />);

    await answerRight(first);

    await waitFor(() => expect(screen.getByText(second.text)).toBeDefined());
  });

  it("carries the running score into the next question", async () => {
    render(<TutorialQuiz onExit={() => {}} />);

    await answerRight(first);

    await waitFor(() => expect(screen.getByText(/مجموعك/)).toBeDefined());
  });

  it("pays nothing for a wrong answer and still moves on", async () => {
    render(<TutorialQuiz onExit={() => {}} />);

    await pick(first.options.find((o) => !first.correctIds.includes(o.id))!.text);
    await confirm();

    await waitFor(() => expect(screen.getByText(second.text)).toBeDefined());
    expect(screen.getByText(/مجموعك 0/)).toBeDefined();
  });

  it("wants every right option of the last question", async () => {
    render(<TutorialQuiz onExit={() => {}} />);
    await answerRight(first);
    await waitFor(() => screen.getByText(second.text));
    await answerRight(second);

    await waitFor(() => expect(screen.getByText(third.text)).toBeDefined());
    await pick(third.options.find((o) => o.id === third.correctIds[0])!.text);
    expect(
      (screen.getByRole("button", { name: "تأكيد الإجابة" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("ends by saying the score does not count", async () => {
    render(<TutorialQuiz onExit={() => {}} />);

    await playAll();

    await waitFor(() => expect(screen.getByText(/أنهيت الجولة التجريبية/)).toBeDefined());
    expect(screen.getByText(/لا تحتسب في المسابقة/)).toBeDefined();
  });

  it("can be taken again from the start", async () => {
    render(<TutorialQuiz onExit={() => {}} />);
    await playAll();
    await waitFor(() => screen.getByText(/أنهيت الجولة التجريبية/));

    await carryOn(/إعادة التجربة/);

    await waitFor(() => expect(screen.getByText(first.text)).toBeDefined());
    expect(screen.getByText(/1 \/ 3/)).toBeDefined();
  });

  it("hands the member back to the competition", async () => {
    const onExit = vi.fn();
    render(<TutorialQuiz onExit={onExit} />);
    await playAll();
    await waitFor(() => screen.getByText(/أنهيت الجولة التجريبية/));

    await carryOn(/العودة للمسابقة/);

    expect(onExit).toHaveBeenCalled();
  });
});
