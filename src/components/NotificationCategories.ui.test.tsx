import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotificationCategories from "./NotificationCategories";
import { push } from "@/lib/messages";

const get = vi.fn();
const put = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => get(...args),
    put: (...args: unknown[]) => put(...args),
  },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const CATEGORIES = [
  { key: "MEMBERSHIP_DECISION", label: push.membershipDecision, optOut: false, enabled: true },
  { key: "QUIZ_ROUND", label: push.quizRound, optOut: true, enabled: true },
  { key: "BROADCAST", label: push.broadcast, optOut: true, enabled: false },
];

beforeEach(() => {
  get.mockReset();
  put.mockReset();
  get.mockResolvedValue({ categories: CATEGORIES });
  put.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("the category switches", () => {
  it("shows one switch per category a member may silence", async () => {
    render(<NotificationCategories />);

    const quiz = await screen.findByRole("switch", { name: push.quizRound });
    expect(quiz.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("switch", { name: push.broadcast }).getAttribute("aria-checked")).toBe(
      "false",
    );
  });

  it("gives no switch to a category that always arrives", async () => {
    render(<NotificationCategories />);

    await screen.findByRole("switch", { name: push.quizRound });
    expect(screen.queryByRole("switch", { name: push.membershipDecision })).toBeNull();
    expect(screen.getByText(new RegExp(push.membershipDecision))).toBeTruthy();
  });

  it("saves the category the member turned off", async () => {
    render(<NotificationCategories />);
    const quiz = await screen.findByRole("switch", { name: push.quizRound });

    await userEvent.click(quiz);

    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("/api/user/notification-preferences", {
        category: "QUIZ_ROUND",
        enabled: false,
      }),
    );
  });

  it("puts the switch back and says so when the save fails", async () => {
    put.mockRejectedValue(new Error("nope"));
    render(<NotificationCategories />);
    const quiz = await screen.findByRole("switch", { name: push.quizRound });

    await userEvent.click(quiz);

    expect(await screen.findByText(push.categorySaveFailed)).toBeTruthy();
    await waitFor(() => expect(quiz.getAttribute("aria-checked")).toBe("true"));
  });

  it("shows nothing at all when the list cannot be read", async () => {
    get.mockRejectedValue(new Error("offline"));

    const { container } = render(<NotificationCategories />);

    await waitFor(() => expect(container.innerHTML).toBe(""));
  });
});
