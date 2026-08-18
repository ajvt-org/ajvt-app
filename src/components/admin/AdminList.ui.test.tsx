import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AdminList from "./AdminList";

describe("AdminList", () => {
  it("shows the plain empty message when there is nothing and no filter is active", () => {
    render(
      <AdminList
        items={[]}
        getKey={(s: string) => s}
        renderRow={(s: string) => <div>{s}</div>}
        emptyMessage="لا توجد عناصر"
      />,
    );

    expect(screen.getByText("لا توجد عناصر")).toBeDefined();
  });

  it("shows the filtered empty message once a filter narrows the list to nothing", () => {
    render(
      <AdminList
        items={[]}
        getKey={(s: string) => s}
        renderRow={(s: string) => <div>{s}</div>}
        emptyMessage="لا توجد عناصر"
        emptyFilteredMessage="لا توجد نتائج مطابقة"
        isFiltered
      />,
    );

    expect(screen.getByText("لا توجد نتائج مطابقة")).toBeDefined();
    expect(screen.queryByText("لا توجد عناصر")).toBeNull();
  });

  it("falls back to the plain empty message when filtered but no filtered message was given", () => {
    render(
      <AdminList
        items={[]}
        getKey={(s: string) => s}
        renderRow={(s: string) => <div>{s}</div>}
        emptyMessage="لا توجد عناصر"
        isFiltered
      />,
    );

    expect(screen.getByText("لا توجد عناصر")).toBeDefined();
  });

  it("renders one row per item, in order", () => {
    render(
      <AdminList
        items={["a", "b", "c"]}
        getKey={(s: string) => s}
        renderRow={(s: string) => <div>row-{s}</div>}
        emptyMessage="لا توجد عناصر"
      />,
    );

    expect(screen.getByText("row-a")).toBeDefined();
    expect(screen.getByText("row-b")).toBeDefined();
    expect(screen.getByText("row-c")).toBeDefined();
  });

  it("renders no pagination controls when none is given", () => {
    render(
      <AdminList
        items={["a"]}
        getKey={(s: string) => s}
        renderRow={(s: string) => <div>{s}</div>}
        emptyMessage="لا توجد عناصر"
      />,
    );

    expect(screen.queryByText(/صفحة/)).toBeNull();
  });

  it("renders pagination and forwards page changes when given", () => {
    const onGo = vi.fn();
    render(
      <AdminList
        items={["a"]}
        getKey={(s: string) => s}
        renderRow={(s: string) => <div>{s}</div>}
        emptyMessage="لا توجد عناصر"
        pagination={{ page: 1, totalPages: 3, onGo }}
      />,
    );

    expect(screen.getByText("صفحة 1 / 3")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /التالي/ }));

    expect(onGo).toHaveBeenCalledWith(2);
  });
});
