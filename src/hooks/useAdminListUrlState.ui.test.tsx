import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useAdminListUrlState } from "./useAdminListUrlState";

let query = "";
const queued: string[] = [];

const replace = vi.fn((href: string) => {
  queued.push(href.includes("?") ? href.slice(href.indexOf("?") + 1) : "");
});

function land() {
  query = queued.shift() ?? query;
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(query),
}));

interface Filters {
  q: string;
}

const adapter = {
  keys: ["q"],
  readFilters: (params: URLSearchParams): Filters => ({ q: params.get("q") ?? "" }),
  writeFilters: (filters: Filters) => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    return params;
  },
};

function Probe({ search = "", to = 2 }: { search?: string; to?: number }) {
  const list = useAdminListUrlState<Filters>("/admin/expenses", adapter);
  return (
    <>
      <p>{`${list.filters.q || "-"}/${list.page}`}</p>
      <button onClick={() => list.go({ q: search })}>search</button>
      <button onClick={() => list.goToPage(to)}>turn</button>
    </>
  );
}

function click(label: string) {
  fireEvent.click(screen.getByText(label));
}

describe("carrying an admin list's filters in the address", () => {
  beforeEach(() => {
    query = "";
    queued.length = 0;
    replace.mockClear();
  });

  it("starts from whatever the address already holds", () => {
    query = "q=foo&page=3";
    render(<Probe />);

    expect(screen.getByText("foo/3")).toBeDefined();
  });

  it("writes a filter change into the address, back onto the first page", () => {
    query = "q=foo&page=3";
    render(<Probe search="bar" />);

    click("search");

    expect(replace).toHaveBeenCalledWith("/admin/expenses?q=bar", { scroll: false });
    expect(screen.getByText("bar/1")).toBeDefined();
  });

  it("keeps the params it does not own", () => {
    query = "denied=1&q=foo";
    render(<Probe search="bar" />);

    click("search");

    expect(replace).toHaveBeenCalledWith("/admin/expenses?denied=1&q=bar", { scroll: false });
  });

  it("follows the address when something else changes it", () => {
    query = "q=foo&page=3";
    const { rerender } = render(<Probe />);

    query = "";
    rerender(<Probe />);

    expect(screen.getByText("-/1")).toBeDefined();
  });

  it("pages from the cleared filters after the active tab is clicked again", () => {
    query = "q=foo&page=3";
    const { rerender } = render(<Probe />);

    query = "";
    rerender(<Probe />);
    click("turn");

    expect(replace).toHaveBeenCalledWith("/admin/expenses?page=2", { scroll: false });
  });

  it("does not rewind to an earlier write of its own that lands late", () => {
    const { rerender } = render(<Probe search="a" />);

    click("search");
    rerender(<Probe search="ab" />);
    click("search");

    land();
    rerender(<Probe search="ab" />);
    expect(screen.getByText("ab/1")).toBeDefined();

    land();
    rerender(<Probe search="ab" />);
    expect(screen.getByText("ab/1")).toBeDefined();
  });
});
