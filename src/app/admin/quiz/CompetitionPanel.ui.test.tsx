import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CompetitionPanel from "./CompetitionPanel";

const get = vi.fn();
const put = vi.fn();
const post = vi.fn();
const del = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...a: unknown[]) => get(...a),
    put: (...a: unknown[]) => put(...a),
    post: (...a: unknown[]) => post(...a),
    del: (...a: unknown[]) => del(...a),
  },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const saved = {
  id: "c1",
  name: "مسابقة الصيف",
  startsAt: "2026-08-20T08:00:00.000Z",
  roundCount: 30,
  roundPeriodMinutes: 1440,
  roundWindowMinutes: 840,
  servedCount: 10,
  poolSize: 30,
  groupSize: 7,
  countingRounds: 6,
  speedBands: [
    { maxSeconds: 10, percent: 100 },
    { maxSeconds: null, percent: 50 },
  ],
  startedAt: null as string | null,
};

beforeEach(() => {
  get.mockReset();
  put.mockReset();
  post.mockReset();
  del.mockReset();
  get.mockResolvedValue({ competition: null });
  put.mockResolvedValue({});
  post.mockResolvedValue({});
  del.mockResolvedValue({});
});

describe("CompetitionPanel", () => {
  it("starts empty when no competition is configured", async () => {
    render(<CompetitionPanel />);

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect((screen.getByLabelText("اسم المسابقة") as HTMLInputElement).value).toBe("");
    expect(screen.queryByRole("button", { name: /إطلاق المسابقة/ })).toBeNull();
  });

  it("loads what was already saved", async () => {
    get.mockResolvedValue({ competition: saved });
    render(<CompetitionPanel />);

    await waitFor(() =>
      expect((screen.getByLabelText("اسم المسابقة") as HTMLInputElement).value).toBe(
        "مسابقة الصيف",
      ),
    );
    expect((screen.getByLabelText("بداية الجولة الأولى") as HTMLInputElement).value).toBe(
      "2026-08-20T08:00",
    );
    expect((screen.getByLabelText("عدد الجولات") as HTMLInputElement).value).toBe("30");
  });

  it("saves what was typed", async () => {
    render(<CompetitionPanel />);
    await waitFor(() => expect(get).toHaveBeenCalled());

    await userEvent.type(screen.getByLabelText("اسم المسابقة"), "مسابقة");
    await userEvent.click(screen.getByRole("button", { name: /حفظ الإعدادات/ }));

    await waitFor(() => expect(put).toHaveBeenCalled());
    expect(put.mock.calls[0][1]).toMatchObject({ name: "مسابقة" });
  });

  it("shows what the server refused", async () => {
    put.mockRejectedValue(new Error("وقت الإغلاق يجب أن يكون بعد وقت الفتح"));
    render(<CompetitionPanel />);
    await waitFor(() => expect(get).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: /حفظ الإعدادات/ }));

    await waitFor(() =>
      expect(screen.getByText(/وقت الإغلاق يجب أن يكون بعد وقت الفتح/)).toBeDefined(),
    );
  });

  it("asks before launching, because it cannot be undone", async () => {
    get.mockResolvedValue({ competition: saved });
    render(<CompetitionPanel />);
    await waitFor(() => screen.getByRole("button", { name: /إطلاق المسابقة/ }));

    await userEvent.click(screen.getByRole("button", { name: /إطلاق المسابقة/ }));

    expect(screen.getByText(/لا يمكن تعديل أي إعداد/)).toBeDefined();
    expect(post).not.toHaveBeenCalled();
  });

  it("launches once confirmed", async () => {
    get.mockResolvedValue({ competition: saved });
    render(<CompetitionPanel />);
    await waitFor(() => screen.getByRole("button", { name: /إطلاق المسابقة/ }));

    await userEvent.click(screen.getByRole("button", { name: /إطلاق المسابقة/ }));
    await userEvent.click(screen.getByRole("button", { name: "إطلاق" }));

    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/admin/quiz/competition/start", {}));
  });

  it("locks every field once it has started", async () => {
    get.mockResolvedValue({ competition: { ...saved, startedAt: "2026-08-20T08:00:00.000Z" } });
    render(<CompetitionPanel />);

    await waitFor(() => expect(screen.getByText(/الإعدادات مغلقة/)).toBeDefined());
    expect((screen.getByLabelText("اسم المسابقة") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("عدد الجولات") as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: /حفظ الإعدادات/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /تصفير النقاط/ })).toBeNull();
  });

  it("clears the scores only after confirming", async () => {
    get.mockResolvedValue({ competition: saved });
    render(<CompetitionPanel />);
    await waitFor(() => screen.getByRole("button", { name: /تصفير النقاط/ }));

    await userEvent.click(screen.getByRole("button", { name: /تصفير النقاط/ }));
    expect(del).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "تصفير" }));
    await waitFor(() => expect(del).toHaveBeenCalledWith("/api/admin/quiz/competition"));
  });
});
