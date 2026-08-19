import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorNotice from "./ErrorNotice";

describe("ErrorNotice", () => {
  it("shows nothing at all when there is no error", () => {
    const { container } = render(<ErrorNotice error="" />);

    expect(container.innerHTML).toBe("");
  });

  it("shows the sentence it was given", () => {
    render(<ErrorNotice error="يرجى إدخال الاسم الكامل" />);

    expect(screen.getByText("يرجى إدخال الاسم الكامل")).toBeDefined();
  });

  it("carries whatever the caller puts beside the sentence", () => {
    render(
      <ErrorNotice error="رقم الهاتف مسجّل مسبقاً">
        <a href="/login">تسجيل الدخول</a>
      </ErrorNotice>,
    );

    expect(screen.getByText("تسجيل الدخول")).toBeDefined();
  });

  it("keeps the extra out when there is no error to attach it to", () => {
    render(
      <ErrorNotice error="">
        <a href="/login">تسجيل الدخول</a>
      </ErrorNotice>,
    );

    expect(screen.queryByText("تسجيل الدخول")).toBeNull();
  });
});
