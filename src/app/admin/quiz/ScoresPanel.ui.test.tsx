import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScoresPanel from "./ScoresPanel";

const get = vi.fn();
const post = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const attempts = [
  { attemptId: "a1", userId: "u1", name: "أحمد", score: 30, voided: false, finishedAt: null },
  { attemptId: "a2", userId: "u2", name: "محمد", score: 10, voided: true, finishedAt: null },
];

const detail = {
  attemptId: "a1",
  name: "أحمد",
  round: 0,
  category: "جغرافيا",
  breakdown: {
    rows: [
      {
        position: 0,
        question: "ما عاصمة موريتانيا؟",
        maxPoints: 10,
        isCorrect: true,
        elapsedMs: 5_000,
        points: 10,
        percent: 100,
        correct: ["نواكشوط"],
        chosen: ["نواكشوط"],
      },
    ],
    correct: 1,
    answered: 1,
    total: 1,
    score: 10,
    possible: 10,
    elapsedMs: 5_000,
  },
};

function answers(role: string) {
  get.mockImplementation((url: string) => {
    if (url === "/api/admin/me") return Promise.resolve({ role });
    if (url.includes("/attempts?round=")) return Promise.resolve({ attempts, opened: true });
    return Promise.resolve({ detail });
  });
}

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  post.mockResolvedValue({ reopened: 2 });
  answers("SUPER");
});

describe("ScoresPanel", () => {
  it("lists who played the round it opens on", async () => {
    render(<ScoresPanel competitionId="c1" roundCount={3} />);

    await waitFor(() => expect(screen.getByText("أحمد")).toBeDefined());
    expect(get).toHaveBeenCalledWith("/api/admin/quiz/competitions/c1/attempts?round=0");
  });

  it("reads another round when one is chosen", async () => {
    render(<ScoresPanel competitionId="c1" roundCount={3} />);
    await waitFor(() => screen.getByText("أحمد"));

    await userEvent.selectOptions(screen.getByLabelText("الجولة"), "2");

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith("/api/admin/quiz/competitions/c1/attempts?round=1"),
    );
  });

  it("opens a member's breakdown", async () => {
    render(<ScoresPanel competitionId="c1" roundCount={3} />);
    await waitFor(() => screen.getByText("أحمد"));

    await userEvent.click(screen.getByText("أحمد"));

    await waitFor(() => expect(screen.getByText("ما عاصمة موريتانيا؟")).toBeDefined());
    expect(get).toHaveBeenCalledWith("/api/admin/quiz/attempts/a1");
  });

  it("closes the breakdown again", async () => {
    render(<ScoresPanel competitionId="c1" roundCount={3} />);
    await waitFor(() => screen.getByText("أحمد"));
    await userEvent.click(screen.getByText("أحمد"));
    await waitFor(() => screen.getByText("ما عاصمة موريتانيا؟"));

    await userEvent.click(screen.getByRole("button", { name: /إغلاق/ }));

    await waitFor(() => expect(screen.queryByText("ما عاصمة موريتانيا؟")).toBeNull());
  });

  it("offers a SUPER admin the way to reopen what a member missed", async () => {
    render(<ScoresPanel competitionId="c1" roundCount={3} />);
    await waitFor(() => screen.getByText("أحمد"));

    await userEvent.click(screen.getAllByRole("button", { name: /إعادة فتح/ })[0]);

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/api/admin/quiz/attempts/a1/reopen", {}),
    );
    expect(await screen.findByText(/أعيد فتح/)).toBeDefined();
  });

  it("keeps that out of the hands of an admin who is not SUPER", async () => {
    answers("QUIZ");
    render(<ScoresPanel competitionId="c1" roundCount={3} />);
    await waitFor(() => screen.getByText("أحمد"));

    expect(screen.queryByRole("button", { name: /إعادة فتح/ })).toBeNull();
  });

  it("shows what the server refused", async () => {
    post.mockRejectedValue(new Error("لا توجد أسئلة فائتة في هذه المحاولة"));
    render(<ScoresPanel competitionId="c1" roundCount={3} />);
    await waitFor(() => screen.getByText("أحمد"));

    await userEvent.click(screen.getAllByRole("button", { name: /إعادة فتح/ })[0]);

    expect(await screen.findByText(/لا توجد أسئلة فائتة/)).toBeDefined();
  });

  it("says so when nobody played the round", async () => {
    get.mockResolvedValue({ attempts: [], opened: true });
    render(<ScoresPanel competitionId="c1" roundCount={3} />);

    await waitFor(() => expect(screen.getByText(/لم يشارك أحد/)).toBeDefined());
  });

  it("tells a round that has not opened apart from an empty one", async () => {
    get.mockResolvedValue({ attempts: [], opened: false });
    render(<ScoresPanel competitionId="c1" roundCount={3} />);

    await waitFor(() => expect(screen.getByText("لم تبدأ هذه الجولة بعد")).toBeDefined());
    expect(screen.queryByText(/لم يشارك أحد/)).toBeNull();
  });

  it("voids the round a member played", async () => {
    render(<ScoresPanel competitionId="c1" roundCount={3} />);
    await waitFor(() => screen.getByText("أحمد"));

    await userEvent.click(screen.getByLabelText("إلغاء نقاط أحمد في هذه الجولة"));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/api/admin/quiz/attempts/a1/void", { voided: true }),
    );
  });

  it("offers to put back what was already voided", async () => {
    render(<ScoresPanel competitionId="c1" roundCount={3} />);
    await waitFor(() => screen.getByText("محمد"));

    await userEvent.click(screen.getByLabelText("إرجاع نقاط محمد في هذه الجولة"));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/api/admin/quiz/attempts/a2/void", { voided: false }),
    );
  });

  it("voids every round of the competition for one member", async () => {
    render(<ScoresPanel competitionId="c1" roundCount={3} />);
    await waitFor(() => screen.getByText("أحمد"));

    await userEvent.click(screen.getByLabelText("إلغاء نقاط أحمد في كل الجولات"));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/api/admin/quiz/competitions/c1/void", {
        userId: "u1",
        voided: true,
      }),
    );
  });

  it("marks a voided round in the list", async () => {
    render(<ScoresPanel competitionId="c1" roundCount={3} />);

    expect(await screen.findByText(/ملغاة/)).toBeDefined();
  });

  it("keeps voiding out of the hands of an admin who is not SUPER", async () => {
    answers("QUIZ");
    render(<ScoresPanel competitionId="c1" roundCount={3} />);
    await waitFor(() => screen.getByText("أحمد"));

    expect(screen.queryByLabelText("إلغاء نقاط أحمد في هذه الجولة")).toBeNull();
  });
});
