import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MemberTemplate from "./template";

describe("MemberTemplate", () => {
  it("glides every page in on navigation", () => {
    render(
      <MemberTemplate>
        <p>محتوى الصفحة</p>
      </MemberTemplate>,
    );

    const page = screen.getByText("محتوى الصفحة").parentElement;
    expect(page?.className).toContain("page-enter");
  });
});
