import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttemptQuestion, { type AttemptView } from "./AttemptQuestion";

const single: AttemptView = {
  answerId: "a1",
  text: "ما عاصمة موريتانيا؟",
  category: "جغرافيا",
  points: 10,
  correctCount: 1,
  options: [
    { id: "o1", text: "نواكشوط" },
    { id: "o2", text: "نواذيبو" },
    { id: "o3", text: "روصو" },
  ],
};

function setup(over: Partial<React.ComponentProps<typeof AttemptQuestion>> = {}) {
  const onSubmit = vi.fn();
  render(
    <AttemptQuestion
      question={single}
      position={0}
      total={10}
      busy={false}
      onSubmit={onSubmit}
      {...over}
    />,
  );
  return { onSubmit };
}

const confirm = () => screen.getByRole("button", { name: "تأكيد الإجابة" });

describe("AttemptQuestion", () => {
  it("shows one question and nothing about the next", () => {
    setup();

    expect(screen.getByText("ما عاصمة موريتانيا؟")).toBeDefined();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("says where the member is in the attempt", () => {
    setup({ position: 3, total: 10 });

    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("4");
  });

  it("cannot be confirmed before something is picked", () => {
    setup();

    expect(confirm()).toHaveProperty("disabled", true);
  });

  it("takes one answer and replaces it when another is picked", async () => {
    const { onSubmit } = setup();

    await userEvent.click(screen.getByRole("radio", { name: "نواذيبو" }));
    await userEvent.click(screen.getByRole("radio", { name: "نواكشوط" }));
    await userEvent.click(confirm());

    expect(onSubmit).toHaveBeenCalledWith(["o1"]);
  });

  it("waits for the full number of answers when a question needs several", async () => {
    const { onSubmit } = setup({ question: { ...single, correctCount: 2 } });

    await userEvent.click(screen.getByRole("checkbox", { name: "نواكشوط" }));
    expect(confirm()).toHaveProperty("disabled", true);

    await userEvent.click(screen.getByRole("checkbox", { name: "روصو" }));
    await userEvent.click(confirm());

    expect(onSubmit).toHaveBeenCalledWith(["o1", "o3"]);
  });

  it("says how many answers a multiple question wants", () => {
    setup({ question: { ...single, correctCount: 2 } });

    expect(screen.getByText(/اختر 2 إجابات/)).toBeDefined();
  });

  it("lets a choice be taken back on a multiple question", async () => {
    setup({ question: { ...single, correctCount: 2 } });

    await userEvent.click(screen.getByRole("checkbox", { name: "نواكشوط" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "نواكشوط" }));

    expect(screen.getByRole("checkbox", { name: "نواكشوط" }).getAttribute("aria-checked")).toBe(
      "false",
    );
  });

  it("accepts nothing while an answer is being sent", async () => {
    const { onSubmit } = setup({ busy: true });

    await userEvent.click(screen.getByRole("radio", { name: "نواكشوط" }));

    expect(confirm()).toHaveProperty("disabled", true);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
