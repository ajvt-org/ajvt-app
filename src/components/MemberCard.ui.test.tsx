import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { HOME_VILLAGE } from "@/lib/villages";
import MemberCard from "./MemberCard";

const toDataURL = vi.fn().mockResolvedValue("data:image/png;base64,QR");

vi.mock("qrcode", () => ({ default: { toDataURL: (...args: unknown[]) => toDataURL(...args) } }));

const BASE = {
  fullName: "محمد ولد أحمد",
  village: HOME_VILLAGE,
  age: "البدريين" as string | null,
  memberNumber: "AJVT-2026-0001",
  verifyToken: "tok-1" as string | null,
  createdAt: "2026-08-11T09:00:00.000Z",
};

function renderCard(over: Partial<typeof BASE> = {}) {
  render(<MemberCard {...BASE} {...over} />);
}

describe("MemberCard", () => {
  beforeEach(() => {
    toDataURL.mockClear();
  });

  it("names the village of a member of the home village next to their age group", () => {
    renderCard();

    expect(screen.getByText(`${HOME_VILLAGE} · البدريين`)).toBeDefined();
  });

  it("names the village on its own for a member who has no age group", () => {
    renderCard({ village: "أفجار", age: null });

    expect(screen.getByText("أفجار")).toBeDefined();
  });

  it("never leaves a stray separator when the age group is missing", () => {
    renderCard({ village: "أفجار", age: null });

    expect(screen.queryByText(/·/)).toBeNull();
  });

  it("still shows the membership number", () => {
    renderCard({ village: "أفجار", age: null });

    expect(screen.getByText("AJVT-2026-0001")).toBeDefined();
  });

  it("points the code at the verify page for the token, whatever the village", async () => {
    renderCard({ village: "أفجار", age: null });

    await waitFor(() => expect(toDataURL).toHaveBeenCalled());
    expect(toDataURL.mock.calls[0][0]).toBe(`${window.location.origin}/verify/tok-1`);
  });

  it("draws no code for a member who has no token yet", async () => {
    renderCard({ verifyToken: null });

    await waitFor(() => expect(toDataURL).not.toHaveBeenCalled());
  });
});
