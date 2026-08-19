import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CompetitionsSection from "./CompetitionsSection";

const get = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...a: unknown[]) => get(...a),
    put: vi.fn(),
    post: vi.fn(),
    del: vi.fn(),
  },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const competition = {
  id: "c1",
  name: "مسابقة الصيف",
  startsAt: "2026-08-20T08:00:00.000Z",
  visibility: "PUBLIC",
  roundCount: 30,
  roundPeriodMinutes: 1440,
  roundWindowMinutes: 840,
  servedCount: 10,
  groupSize: 7,
  countingRounds: 6,
  categoryRounds: false,
  boards: [{ title: "ترتيب الجولة", blockRounds: 1, counting: 1, wholeRun: false }],
  bankId: "general",
  fullSeconds: 10,
  maxSeconds: 30,
  floorPercent: 50,
  startedAt: null,
  _count: { participants: 0, rounds: 0 },
};

beforeEach(() => {
  get.mockReset();
  get.mockImplementation((url: string) => {
    if (url === "/api/admin/quiz/banks")
      return Promise.resolve({ banks: [{ id: "general", name: "البنك العام" }] });
    if (url === "/api/admin/quiz/competitions") return Promise.resolve({ competitions: [] });
    if (url.endsWith("/rounds")) return Promise.reject(new Error("لا توجد مسابقة"));
    return Promise.resolve({ competition });
  });
});

describe("CompetitionsSection", () => {
  it("shows only the list while no competition is picked", async () => {
    render(<CompetitionsSection />);

    await waitFor(() => expect(screen.getByText(/لا توجد مسابقة بعد/)).toBeDefined());
    expect(screen.queryByLabelText("اسم المسابقة")).toBeNull();
  });

  it("opens an empty editor for a new competition", async () => {
    render(<CompetitionsSection />);
    await waitFor(() => screen.getByText(/لا توجد مسابقة بعد/));

    await userEvent.click(screen.getByRole("button", { name: /مسابقة جديدة/ }));

    expect((screen.getByLabelText("اسم المسابقة") as HTMLInputElement).value).toBe("");
  });

  it("opens the editor on the competition that exists", async () => {
    get.mockImplementation((url: string) => {
      if (url === "/api/admin/quiz/banks")
        return Promise.resolve({ banks: [{ id: "general", name: "البنك العام" }] });
      if (url === "/api/admin/quiz/competitions")
        return Promise.resolve({ competitions: [competition] });
      if (url.endsWith("/rounds")) return Promise.reject(new Error("لا توجد مسابقة"));
      return Promise.resolve({ competition });
    });
    render(<CompetitionsSection />);

    await waitFor(() =>
      expect((screen.getByLabelText("اسم المسابقة") as HTMLInputElement).value).toBe(
        "مسابقة الصيف",
      ),
    );
  });
});
