import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VerbButton from "./VerbButton";
import { SAFE } from "./verbTones";

describe("a verb drawn as an icon", () => {
  it("keeps the words it lost as the name a reader hears", () => {
    render(<VerbButton icon="trash" label="حذف نهائياً" tone={SAFE} onClick={vi.fn()} />);

    expect(screen.getByRole("button", { name: "حذف نهائياً" })).toBeTruthy();
  });

  it("says the same thing on hover", () => {
    render(<VerbButton icon="trash" label="حذف نهائياً" tone={SAFE} onClick={vi.fn()} />);

    expect(screen.getByRole("button").getAttribute("title")).toBe("حذف نهائياً");
  });

  it("takes its name from the words when a verb keeps them", () => {
    render(
      <VerbButton icon="lock" label="إعادة تعيين" tone={SAFE} onClick={vi.fn()}>
        إعادة تعيين
      </VerbButton>,
    );

    const button = screen.getByRole("button", { name: "إعادة تعيين" });
    expect(button.getAttribute("aria-label")).toBeNull();
  });

  it("runs the verb when it is pressed", async () => {
    const onClick = vi.fn();
    render(<VerbButton icon="pencil" label="تعديل" tone={SAFE} onClick={onClick} />);

    await userEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalled();
  });

  it("cannot be pressed while the card is busy", async () => {
    const onClick = vi.fn();
    render(<VerbButton icon="pencil" label="تعديل" tone={SAFE} disabled onClick={onClick} />);

    await userEvent.click(screen.getByRole("button"));

    expect(onClick).not.toHaveBeenCalled();
  });
});
