import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import DeletedRecordsPage from "./page";

const get = vi.fn();
const post = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
  },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const RECORD = {
  id: "d1",
  kind: "Member",
  label: "محمد ولد أحمد",
  deletedBy: "admin",
  deletedAt: "2026-08-20T00:00:00.000Z",
  daysLeft: 27,
};

async function visit(records: unknown[]) {
  cleanup();
  get.mockResolvedValue({ records });
  render(<DeletedRecordsPage />);
  await waitFor(() => expect(get).toHaveBeenCalled());
}

describe("DeletedRecordsPage", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it("shows what was deleted, by whom, and how long it survives", async () => {
    await visit([RECORD]);

    expect(await screen.findByText("محمد ولد أحمد")).toBeDefined();
    expect(screen.getByText(/عضو/)).toBeDefined();
    expect(screen.getByText(/admin/)).toBeDefined();
    expect(screen.getByText(/27/)).toBeDefined();
  });

  it("says the trash is empty when it is", async () => {
    await visit([]);

    expect(await screen.findByText("السلة فارغة")).toBeDefined();
  });

  it("restores a record and reloads the list", async () => {
    await visit([RECORD]);
    post.mockResolvedValue({ ok: true });
    get.mockResolvedValue({ records: [] });

    fireEvent.click(await screen.findByText("استرجاع"));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith("/api/admin/deleted/d1/restore", {});
      expect(screen.getByText("السلة فارغة")).toBeDefined();
    });
  });
});
