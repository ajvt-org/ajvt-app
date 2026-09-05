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

  it("offers no way to type over the number itself", () => {
    show([account()]);
    fireEvent.click(screen.getByLabelText(texts.edit("111111")));

    expect(screen.getByLabelText(texts.descriptionLabel)).toBeDefined();
    const typable = screen.getAllByLabelText(texts.newLabel) as HTMLInputElement[];
    expect(typable).toHaveLength(1);
    expect(typable[0].value).toBe("");
  });
});

describe("a number that has been closed", () => {
  const closedOn = new Date(2026, 7, 14);

  it("says when it was closed", () => {
    show([account({ closedAt: closedOn, active: false })]);
    expect(screen.getByText(/مغلق في/)).toBeDefined();
  });

  it("stays listed with the number still readable", () => {
    show([account({ closedAt: closedOn, active: false })]);
    expect(screen.getByText("111111")).toBeDefined();
  });

  it("keeps the count of what points at it", () => {
    show([account({ closedAt: closedOn, active: false, used: 9 })]);
    expect(screen.getByText(/9/)).toBeDefined();
  });

  it("offers nothing to do to it, and no way to remove it", () => {
    show([account({ closedAt: closedOn, active: false })]);
    expect(screen.queryByRole("button", { name: texts.replace })).toBeNull();
    expect(screen.queryByLabelText(texts.edit("111111"))).toBeNull();
    expect(screen.queryByLabelText(texts.toggle("111111"))).toBeNull();
  });
});

describe("replacing a number", () => {
  it("says the old one stays and the past payments stay on it", () => {
    show([account()]);
    fireEvent.click(screen.getByRole("button", { name: texts.replace }));
    expect(screen.getByText(texts.replaceWarning)).toBeDefined();
  });

  it("asks for the new number and will not take an empty one", () => {
    show([account()]);
    fireEvent.click(screen.getByRole("button", { name: texts.replace }));
    expect(screen.getByLabelText(texts.replaceLabel)).toBeDefined();
    const confirm = screen.getAllByRole("button", { name: texts.replace })[0];
    expect(confirm.hasAttribute("disabled")).toBe(true);
  });

  it("reports the replacement once a number is typed", () => {
    const onRun = show([account()]);
    fireEvent.click(screen.getByRole("button", { name: texts.replace }));
    fireEvent.change(screen.getByLabelText(texts.replaceLabel), { target: { value: "222222" } });
    fireEvent.click(screen.getAllByRole("button", { name: texts.replace })[0]);
    expect(onRun).toHaveBeenCalled();
  });
});
