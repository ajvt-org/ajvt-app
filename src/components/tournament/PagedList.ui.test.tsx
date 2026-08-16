import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PagedList from "./PagedList";

function rows(n: number) {
  return Array.from({ length: n }, (_, i) => <p key={i}>لاعب {i + 1}</p>);
}

const MORE = /عرض المزيد/;

describe("PagedList", () => {
  it("shows the first page and holds back the rest", () => {
    render(<PagedList pageSize={3}>{rows(8)}</PagedList>);

    expect(screen.getByText("لاعب 3")).toBeDefined();
    expect(screen.queryByText("لاعب 4")).toBeNull();
  });

  it("adds one page per press rather than the whole remainder", async () => {
    render(<PagedList pageSize={3}>{rows(8)}</PagedList>);

    await userEvent.click(screen.getByRole("button", { name: MORE }));

    expect(screen.getByText("لاعب 6")).toBeDefined();
    expect(screen.queryByText("لاعب 7")).toBeNull();
  });

  it("stops offering more once the rows run out", async () => {
    render(<PagedList pageSize={3}>{rows(8)}</PagedList>);

    await userEvent.click(screen.getByRole("button", { name: MORE }));
    await userEvent.click(screen.getByRole("button", { name: MORE }));

    expect(screen.getByText("لاعب 8")).toBeDefined();
    expect(screen.queryByRole("button", { name: MORE })).toBeNull();
  });

  it("offers nothing to press when everything already fits", () => {
    render(<PagedList pageSize={10}>{rows(4)}</PagedList>);

    expect(screen.queryByRole("button", { name: MORE })).toBeNull();
    expect(screen.getByText("لاعب 4")).toBeDefined();
  });
});
