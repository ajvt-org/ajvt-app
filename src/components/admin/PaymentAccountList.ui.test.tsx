import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PaymentAccountList from "./PaymentAccountList";
import { paymentAccountManager as texts } from "@/lib/texts";
import type { AdminAccountRow } from "@/lib/paymentMethodAdmin";

const METHOD = "m1";

function account(over: Partial<AdminAccountRow> = {}): AdminAccountRow {
  return {
    id: "a1",
    code: "111111",
    label: null,
    position: 1,
    active: true,
    closedAt: null,
    used: 0,
    ...over,
  };
}

function show(accounts: AdminAccountRow[], onRun = vi.fn()) {
  render(<PaymentAccountList methodId={METHOD} accounts={accounts} busy={false} onRun={onRun} />);
  return onRun;
}

describe("the numbers listed under a method", () => {
  it("shows each number a method receives into", () => {
    show([account(), account({ id: "a2", code: "222222", position: 2 })]);
    expect(screen.getByText("111111")).toBeDefined();
    expect(screen.getByText("222222")).toBeDefined();
  });

  it("says a method has none without calling it a problem", () => {
    show([]);
    expect(screen.getByText(texts.none)).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("offers to add a number whether or not one is there already", () => {
    show([]);
    expect(screen.getByLabelText(texts.newLabel)).toBeDefined();
    expect(screen.getByRole("button", { name: texts.add })).toBeDefined();
  });

  it("adds a second number with the same action as the first", () => {
    const onRun = show([account()]);
    fireEvent.change(screen.getByLabelText(texts.newLabel), { target: { value: "222222" } });
    fireEvent.click(screen.getByRole("button", { name: texts.add }));
    expect(onRun).toHaveBeenCalled();
  });

  it("will not add an empty number", () => {
    show([]);
    expect(screen.getByRole("button", { name: texts.add }).hasAttribute("disabled")).toBe(true);
  });

  it("says which number is stopped", () => {
    show([account({ active: false })]);
    expect(screen.getByText(texts.stopped)).toBeDefined();
  });

  it("shows how many records point at a number", () => {
    show([account({ used: 9 })]);
    expect(screen.getByText(/9/)).toBeDefined();
  });

  it("reads the number left to right, since it is a number to transcribe", () => {
    show([account()]);
    expect(screen.getByText("111111").getAttribute("dir")).toBe("ltr");
  });

  it("offers no reorder above the first or below the last", () => {
    show([account(), account({ id: "a2", code: "222222", position: 2 })]);
    const up = screen.getAllByLabelText(texts.moveUp);
    const down = screen.getAllByLabelText(texts.moveDown);
    expect(up[0].hasAttribute("disabled")).toBe(true);
    expect(down[1].hasAttribute("disabled")).toBe(true);
  });

  it("opens a number for editing with its description", () => {
    show([account({ label: "القديم" })]);
    fireEvent.click(screen.getByLabelText(texts.edit("111111")));
    expect((screen.getByLabelText(texts.descriptionLabel) as HTMLInputElement).value).toBe(
      "القديم",
    );
  });
});
