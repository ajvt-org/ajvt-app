import { describe, it, expect, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import NewActivityForm from "./NewActivityForm";

function show() {
  cleanup();
  const onCreate = vi.fn().mockResolvedValue(undefined);
  render(<NewActivityForm onCreate={onCreate} />);
  fireEvent.change(screen.getByPlaceholderText("عنوان النشاط"), {
    target: { value: "بطولة الدامة" },
  });
  fireEvent.change(screen.getByPlaceholderText("الوصف"), { target: { value: "وصف" } });
  return onCreate;
}

describe("NewActivityForm", () => {
  it("creates a plain activity when no other nature is picked", async () => {
    const onCreate = show();

    fireEvent.click(screen.getByText("إضافة"));

    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    expect(onCreate.mock.calls[0][0]).toMatchObject({ isTournament: false, isVolunteer: false });
  });

  it("asks the tournament questions and carries the answers", async () => {
    const onCreate = show();

    fireEvent.click(screen.getByText("بطولة"));
    fireEvent.click(screen.getByText("بطولة فردية"));
    fireEvent.change(screen.getByLabelText("نظام البطولة"), {
      target: { value: "GROUPS_THEN_KNOCKOUT" },
    });
    fireEvent.click(screen.getByText("إضافة"));

    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    expect(onCreate.mock.calls[0][0]).toMatchObject({
      isTournament: true,
      isVolunteer: false,
      minTeamSize: "1",
      maxTeamSize: "1",
      matchShape: "SERIES",
      format: "GROUPS_THEN_KNOCKOUT",
    });
  });

  it("keeps the natures mutually exclusive", async () => {
    const onCreate = show();

    fireEvent.click(screen.getByText("بطولة"));
    fireEvent.click(screen.getByText("حملة تطوعية"));
    fireEvent.change(
      screen.getByPlaceholderText("رابط مجموعة الواتساب — https://chat.whatsapp.com/..."),
      { target: { value: "https://chat.whatsapp.com/x" } },
    );
    fireEvent.click(screen.getByText("إضافة"));

    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    expect(onCreate.mock.calls[0][0]).toMatchObject({ isTournament: false, isVolunteer: true });
  });
});
