import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import AdminToolsPage from "./page";
import { adminTabs, adminTools } from "@/lib/texts";

const get = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { get: (...args: unknown[]) => get(...args) },
}));

async function open(role = "SUPER") {
  cleanup();
  get.mockResolvedValue({ role });
  const view = render(<AdminToolsPage />);
  await waitFor(() => expect(get).toHaveBeenCalled());
  await screen.findByRole("navigation");
  return view;
}

beforeEach(() => {
  get.mockReset();
});

describe("the admin tools page", () => {
  it("starts with the list rather than repeating the tab above it", async () => {
    const { container } = await open();

    expect(screen.queryByText(adminTabs.tools)).toBeNull();
    expect(container.querySelector(".admin-page > *")?.tagName).toBe("NAV");
  });

  it("still names the list for a reader who cannot see it", async () => {
    await open();

    expect(screen.getByRole("navigation").getAttribute("aria-label")).toBe(adminTabs.tools);
  });

  it("lists the tools the role can open", async () => {
    await open();

    expect(screen.getByText(adminTools.password)).toBeDefined();
    expect(screen.getByText(adminTools.auditLog)).toBeDefined();
  });

  it("leaves out what the role cannot open", async () => {
    await open("ADMIN");

    expect(screen.queryByText(adminTools.auditLog)).toBeNull();
  });
});
