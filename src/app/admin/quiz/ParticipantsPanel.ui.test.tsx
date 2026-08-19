import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ParticipantsPanel from "./ParticipantsPanel";

const get = vi.fn();
const put = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { get: (...a: unknown[]) => get(...a), put: (...a: unknown[]) => put(...a) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const body = {
  userIds: ["u1"],
  candidates: [
    { userId: "u1", fullName: "أحمد" },
    { userId: "u2", fullName: "محمد" },
  ],
};

beforeEach(() => {
  get.mockReset();
  put.mockReset();
  get.mockResolvedValue(body);
  put.mockResolvedValue({ saved: 2 });
});

describe("ParticipantsPanel", () => {
  it("ticks the members who are already in", async () => {
    render(<ParticipantsPanel competitionId="c1" locked={false} />);

    await waitFor(() => screen.getByText("أحمد"));
    const boxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes[0].checked).toBe(true);
    expect(boxes[1].checked).toBe(false);
  });

  it("saves the list that was ticked", async () => {
    render(<ParticipantsPanel competitionId="c1" locked={false} />);
    await waitFor(() => screen.getByText("محمد"));

    await userEvent.click(screen.getAllByRole("checkbox")[1]);
    await userEvent.click(screen.getByRole("button", { name: /حفظ المشاركين/ }));

    await waitFor(() => expect(put).toHaveBeenCalled());
    expect(put.mock.calls[0][0]).toBe("/api/admin/quiz/competitions/c1/participants");
    expect(put.mock.calls[0][1]).toEqual({ userIds: ["u1", "u2"] });
  });

  it("drops a member who was unticked", async () => {
    render(<ParticipantsPanel competitionId="c1" locked={false} />);
    await waitFor(() => screen.getByText("أحمد"));

    await userEvent.click(screen.getAllByRole("checkbox")[0]);
    await userEvent.click(screen.getByRole("button", { name: /حفظ المشاركين/ }));

    await waitFor(() => expect(put).toHaveBeenCalled());
    expect(put.mock.calls[0][1]).toEqual({ userIds: [] });
  });

  it("stops the list being changed once the competition has started", async () => {
    render(<ParticipantsPanel competitionId="c1" locked={true} />);

    await waitFor(() => screen.getByText("أحمد"));
    expect((screen.getAllByRole("checkbox")[0] as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: /حفظ المشاركين/ })).toBeNull();
  });

  it("shows what the server refused", async () => {
    put.mockRejectedValue(new Error("المسابقة انطلقت"));
    render(<ParticipantsPanel competitionId="c1" locked={false} />);
    await waitFor(() => screen.getByText("أحمد"));

    await userEvent.click(screen.getByRole("button", { name: /حفظ المشاركين/ }));

    await waitFor(() => expect(screen.getByText(/المسابقة انطلقت/)).toBeDefined());
  });
});
