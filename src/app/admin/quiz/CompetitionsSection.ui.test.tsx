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
  categoryRounds: false,
  boards: [{ title: "ترتيب الجولة", blockRounds: 1, counting: 1, wholeRun: false }],
  bankId: "general",
  fullSeconds: 10,
  maxSeconds: 30,
  floorPercent: 50,
  startedAt: null,
  _count: { participants: 0, rounds: 0 },
};

const rounds = {
  rounds: [
    {
      index: 0,
      opensAt: competition.startsAt,
      closesAt: competition.startsAt,
      category: null,
      loaded: 10,
    },
  ],
  bankSize: 300,
  plannable: 30,
  servedCount: 10,
  startedAt: null as string | null,
};

const standings = {
  running: true,
  round: 1,
  roundCount: 30,
  boards: [
    {
      id: "b1",
      title: "الترتيب العام",
      blockTitle: "الجولة",
      blockRounds: 1,
      wholeRun: true,
      block: 0,
      blocks: 1,
      rows: [{ rank: 1, userId: "u1", name: "يوسف", total: 41 }],
    },
  ],
};

function serve(row: Record<string, unknown>) {
  get.mockImplementation((url: string) => {
    if (url === "/api/admin/me") return Promise.resolve({ role: "SUPER" });
    if (url === "/api/admin/quiz/banks")
      return Promise.resolve({ banks: [{ id: "general", name: "البنك العام" }] });
    if (url === "/api/admin/quiz/competitions") return Promise.resolve({ competitions: [row] });
    if (url.endsWith("/rounds"))
      return Promise.resolve({ ...rounds, startedAt: row.startedAt as string | null });
    if (url.endsWith("/participants"))
      return Promise.resolve({ userIds: [], candidates: [{ userId: "u1", fullName: "يوسف" }] });
    if (url.includes("/standings")) return Promise.resolve(standings);
    if (url.includes("/attempts?round=")) return Promise.resolve({ attempts: [], opened: true });
    return Promise.resolve({ competition: row });
  });
}

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

  it("opens a competition that has not started on its rounds", async () => {
    serve(competition);
    render(<CompetitionsSection />);

    await waitFor(() => expect(screen.getByText(/جولات المسابقة/)).toBeDefined());
    expect(screen.queryByLabelText("اسم المسابقة")).toBeNull();
  });

  it("puts the settings a tab away rather than at the top of the page", async () => {
    serve(competition);
    render(<CompetitionsSection />);
    await waitFor(() => screen.getByText(/جولات المسابقة/));

    await userEvent.click(screen.getByRole("button", { name: /الإعدادات/ }));

    await waitFor(() =>
      expect((screen.getByLabelText("اسم المسابقة") as HTMLInputElement).value).toBe(
        "مسابقة الصيف",
      ),
    );
  });

  it("opens a running competition on its standings and keeps the scores a tab away", async () => {
    serve({ ...competition, startedAt: "2026-08-21T08:00:00.000Z" });
    render(<CompetitionsSection />);

    await waitFor(() => expect(screen.getByText(/1 · يوسف/)).toBeDefined());

    await userEvent.click(screen.getByRole("button", { name: /النقاط/ }));

    await waitFor(() => expect(screen.getByText(/نقاط المشاركين/)).toBeDefined());
  });

  it("reaches the participants of a private competition", async () => {
    serve({ ...competition, visibility: "PRIVATE" });
    render(<CompetitionsSection />);
    await waitFor(() => screen.getByText(/جولات المسابقة/));

    await userEvent.click(screen.getByRole("button", { name: /المشاركون/ }));

    await waitFor(() => expect(screen.getByLabelText("يوسف")).toBeDefined());
    expect((screen.getByLabelText("يوسف") as HTMLInputElement).disabled).toBe(false);
  });

  it("still refuses to change the participants of a competition that has started", async () => {
    serve({
      ...competition,
      visibility: "PRIVATE",
      startedAt: "2026-08-21T08:00:00.000Z",
    });
    render(<CompetitionsSection />);
    await waitFor(() => screen.getByText(/1 · يوسف/));

    await userEvent.click(screen.getByRole("button", { name: "الإعداد" }));
    await userEvent.click(screen.getByRole("button", { name: /المشاركون/ }));

    await waitFor(() => expect(screen.getByLabelText("يوسف")).toBeDefined());
    expect((screen.getByLabelText("يوسف") as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: /حفظ المشاركين/ })).toBeNull();
  });
});
