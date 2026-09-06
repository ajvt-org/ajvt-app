import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeleteMemberCard from "./DeleteMemberCard";
import { confirmDelete, deleteMember } from "@/lib/texts";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function mockFetch() {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function setup(userId: string | null = "u1") {
  render(<DeleteMemberCard memberId="m1" userId={userId} fullName="محمد ولد أحمد" />);
}

async function confirmWith(name: string) {
  await userEvent.click(screen.getByRole("button", { name: confirmDelete.proceed }));
  await userEvent.type(screen.getByLabelText(confirmDelete.nameField), name);
  await userEvent.click(screen.getByRole("button", { name: confirmDelete.confirm }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("DeleteMemberCard", () => {
  it("asks for the name before deleting anything", async () => {
    const fetchMock = mockFetch();
    setup();

    await userEvent.click(screen.getByRole("button", { name: new RegExp(deleteMember.payment) }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: confirmDelete.proceed })).toBeDefined();
  });

  it("offers two buttons with no heading and no sentence under either", () => {
    mockFetch();
    setup();

    expect(screen.queryByText(confirmDelete.title)).toBeNull();
    expect(screen.queryByText(deleteMember.paymentConsequence("محمد ولد أحمد"))).toBeNull();
    expect(screen.queryByText(deleteMember.personConsequence("محمد ولد أحمد"))).toBeNull();
  });

  it("says in the confirmation that only the payment goes", async () => {
    mockFetch();
    setup();

    await userEvent.click(screen.getByRole("button", { name: new RegExp(deleteMember.payment) }));

    expect(screen.getByText(deleteMember.paymentConsequence("محمد ولد أحمد"))).toBeDefined();
  });

  it("says in the confirmation that the whole person goes", async () => {
    mockFetch();
    setup();

    await userEvent.click(screen.getByRole("button", { name: new RegExp(deleteMember.person) }));

    expect(screen.getByText(deleteMember.personConsequence("محمد ولد أحمد"))).toBeDefined();
  });

  it("sends the typed name with the deletion, which the API demands", async () => {
    const fetchMock = mockFetch();
    setup();

    await userEvent.click(screen.getByRole("button", { name: new RegExp(deleteMember.payment) }));
    await confirmWith("محمد ولد أحمد");

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/dashboard"));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/members/m1");
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      confirmName: "محمد ولد أحمد",
    });
  });

  it("keeps the delete disabled until the name matches", async () => {
    const fetchMock = mockFetch();
    setup();

    await userEvent.click(screen.getByRole("button", { name: new RegExp(deleteMember.payment) }));
    await confirmWith("محمد");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deletes the person through the account, not the payment", async () => {
    const fetchMock = mockFetch();
    setup();

    await userEvent.click(screen.getByRole("button", { name: new RegExp(deleteMember.person) }));
    await confirmWith("محمد ولد أحمد");

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/dashboard"));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/users/u1");
  });

  it("offers no person deletion when there is no account to delete", () => {
    mockFetch();
    setup(null);

    expect(screen.queryByRole("button", { name: new RegExp(deleteMember.person) })).toBeNull();
    expect(screen.getByRole("button", { name: new RegExp(deleteMember.payment) })).toBeDefined();
  });
});
