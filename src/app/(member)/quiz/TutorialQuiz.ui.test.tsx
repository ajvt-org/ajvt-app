import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TutorialQuiz from "./TutorialQuiz";
import type { TutorialView } from "@/lib/quizTutorialServer";
import type { ScoreCurve } from "@/lib/competitionConfig";

const CURVE: ScoreCurve = { fullSeconds: 3, maxSeconds: 10, floorPercent: 50 };

function made(id: string, text: string, right: string, wrong: string[]): TutorialView {
  return {
    id,
    text,
    category: "تجربة",
    points: 10,
    correctCount: 1,
    options: [
      { id: `${id}a`, text: right },
      ...wrong.map((o, i) => ({ id: `${id}${i}`, text: o })),
    ],
    correctIds: [`${id}a`],
  };
}

const QUESTIONS = [
  made("t1", "ما عاصمة موريتانيا؟", "نواكشوط", ["نواذيبو", "كيفة"]),
  made("t2", "كم عدد أيام الأسبوع؟", "سبعة", ["ستة", "ثمانية"]),
  made("t3", "كم عدد ألوان قوس قزح؟", "سبعة ألوان", ["ستة ألوان", "ثمانية ألوان"]),
];

const [first, second, third] = QUESTIONS;

function show(onExit = () => {}, questions = QUESTIONS) {
  return render(<TutorialQuiz questions={questions} curve={CURVE} onExit={onExit} />);
}

const pick = (text: string) => userEvent.click(screen.getByText(text));
const confirm = () => userEvent.click(screen.getByRole("button", { name: "تأكيد الإجابة" }));
const carryOn = (name: RegExp) => userEvent.click(screen.getByRole("button", { name }));

async function answerRight(question: TutorialView) {
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
    show();

    expect(screen.getByText(/لا تحتسب نقاطها/)).toBeDefined();
  });

  it("starts on the first question", () => {
    show();

    expect(screen.getByText(first.text)).toBeDefined();
  });

  it("goes straight to the next question when an answer is confirmed", async () => {
    show();

    await answerRight(first);

    await waitFor(() => expect(screen.getByText(second.text)).toBeDefined());
  });

  it("keeps the score off the question screen", async () => {
    show();

    await answerRight(first);

    await waitFor(() => expect(screen.getByText(second.text)).toBeDefined());
    expect(screen.queryByText(/مجموعك/)).toBeNull();
  });

  it("pays nothing for a wrong answer and still moves on", async () => {
    show();

    await pick(first.options.find((o) => !first.correctIds.includes(o.id))!.text);
    await confirm();

    await waitFor(() => expect(screen.getByText(second.text)).toBeDefined());
  });

  it("asks for one answer on every question, the last included", async () => {
    show();
    await answerRight(first);
    await waitFor(() => screen.getByText(second.text));
    await answerRight(second);

    await waitFor(() => expect(screen.getByText(third.text)).toBeDefined());
    expect(screen.getAllByRole("radio").length).toBeGreaterThan(0);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("ends by saying the score does not count", async () => {
    show();

    await playAll();

    await waitFor(() => expect(screen.getByText(/أنهيت الجولة التجريبية/)).toBeDefined());
    expect(screen.getByText(/لا تحتسب في المسابقة/)).toBeDefined();
  });

  it("can be taken again from the start", async () => {
    show();
    await playAll();
    await waitFor(() => screen.getByText(/أنهيت الجولة التجريبية/));

    await carryOn(/إعادة التجربة/);

    await waitFor(() => expect(screen.getByText(first.text)).toBeDefined());
  });

  it("hands the member back to the competition", async () => {
    const onExit = vi.fn();
    show(onExit);
    await playAll();
    await waitFor(() => screen.getByText(/أنهيت الجولة التجريبية/));

    await carryOn(/العودة للمسابقة/);

    expect(onExit).toHaveBeenCalled();
  });
});
