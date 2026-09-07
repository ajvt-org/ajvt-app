import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Disclosure from "./Disclosure";

function draw() {
  render(
    <Disclosure title="سجل العملية" color="#92400e">
      <p>محتوى</p>
    </Disclosure>,
  );
}

describe("a box that opens on an admin card", () => {
  it("says whether it is open on the control that opens it", async () => {
    draw();

    const control = screen.getByRole("button");
    expect(control.getAttribute("aria-expanded")).toBe("false");

    await userEvent.click(control);

    expect(control.getAttribute("aria-expanded")).toBe("true");
  });

  it("keeps what it holds unmounted until it is opened", async () => {
    draw();

    expect(screen.queryByText("محتوى")).toBeNull();

    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByText("محتوى")).toBeTruthy();
  });

  it("shuts again on a second press", async () => {
    draw();

    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("button"));

    expect(screen.queryByText("محتوى")).toBeNull();
  });

  it("opens from the keyboard, since it is a button", async () => {
    draw();

    await userEvent.tab();
    await userEvent.keyboard("{Enter}");

    expect(screen.getByText("محتوى")).toBeTruthy();
  });
});
