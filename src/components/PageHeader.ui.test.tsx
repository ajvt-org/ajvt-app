import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PageHeader from "./PageHeader";

describe("PageHeader", () => {
  it("shows the page title", () => {
    render(<PageHeader title="دعم الرابطة" />);

    expect(screen.getByRole("heading", { name: "دعم الرابطة" })).toBeDefined();
  });

  it("has no back control unless one is asked for", () => {
    render(<PageHeader title="دعم الرابطة" />);

    expect(screen.queryByLabelText("رجوع")).toBeNull();
  });

  it("points the back control at the page it was given", () => {
    render(<PageHeader title="لوحة الشرف" backHref="/home" />);

    const back = screen.getByLabelText("رجوع");
    expect(back.getAttribute("href")).toBe("/home");
  });

  it("renders the back control as a link, so it works before javascript loads", () => {
    render(<PageHeader title="لوحة الشرف" backHref="/" />);

    expect(screen.getByLabelText("رجوع").tagName).toBe("A");
  });

  it("puts any actions it is given into the header", () => {
    render(<PageHeader title="الرئيسية" actions={<button>خروج</button>} />);

    expect(screen.getByRole("button", { name: "خروج" })).toBeDefined();
  });
});
