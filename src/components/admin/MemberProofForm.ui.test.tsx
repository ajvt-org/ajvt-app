import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MemberProofForm from "./MemberProofForm";

const put = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { put: (...a: unknown[]) => put(...a) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

vi.mock("@/components/ProofUpload", () => ({
  default: ({ onUploaded }: { onUploaded: (name: string) => void }) => (
    <button type="button" onClick={() => onUploaded("late.webp")}>
      رفع
    </button>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  put.mockResolvedValue({});
});

async function openFor(proof: string | null, onSaved = vi.fn()) {
  render(<MemberProofForm memberId="m1" proof={proof} onSaved={onSaved} />);
  await userEvent.click(screen.getByRole("button"));
  return onSaved;
}

describe("MemberProofForm", () => {
  it("offers to add a proof to a member who has none", () => {
    render(<MemberProofForm memberId="m1" proof={null} onSaved={vi.fn()} />);

    expect(screen.getByRole("button", { name: /إضافة إثبات الدفع/ })).toBeTruthy();
  });

  it("offers to replace a proof that is already there", () => {
    render(<MemberProofForm memberId="m1" proof="old.webp" onSaved={vi.fn()} />);

    expect(screen.getByRole("button", { name: /استبدال الإثبات/ })).toBeTruthy();
  });

  it("will not save before a file has been picked", async () => {
    await openFor(null);

    expect(screen.getByRole("button", { name: /حفظ الإثبات/ })).toHaveProperty("disabled", true);
  });

  it("sends only the proof, so the amount is left alone", async () => {
    const onSaved = await openFor(null);

    await userEvent.click(screen.getByRole("button", { name: "رفع" }));
    await userEvent.click(screen.getByRole("button", { name: /حفظ الإثبات/ }));

    expect(put).toHaveBeenCalledWith("/api/admin/members/m1/payment", {
      paymentProof: "late.webp",
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it("closes back to the button once it is saved", async () => {
    await openFor(null);

    await userEvent.click(screen.getByRole("button", { name: "رفع" }));
    await userEvent.click(screen.getByRole("button", { name: /حفظ الإثبات/ }));

    expect(await screen.findByRole("button", { name: /إضافة إثبات الدفع/ })).toBeTruthy();
  });

  it("says what went wrong and keeps the form open", async () => {
    put.mockRejectedValue(new Error("لا صلاحية"));
    const onSaved = await openFor(null);

    await userEvent.click(screen.getByRole("button", { name: "رفع" }));
    await userEvent.click(screen.getByRole("button", { name: /حفظ الإثبات/ }));

    expect(await screen.findByText(/لا صلاحية/)).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("gives up on the upload when it is cancelled", async () => {
    await openFor(null);

    await userEvent.click(screen.getByRole("button", { name: "رفع" }));
    await userEvent.click(screen.getByRole("button", { name: /إلغاء/ }));

    expect(put).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /إضافة إثبات الدفع/ })).toBeTruthy();
  });
});
