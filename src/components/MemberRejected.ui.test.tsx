import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MemberRejected from "./MemberRejected";
import type { MemberData } from "@/lib/useMember";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("@/components/ProofUpload", () => ({
  default: ({ onUploaded }: { onUploaded: (name: string) => void }) => (
    <button onClick={() => onUploaded("better.webp")}>ارفع</button>
  ),
}));

const post = vi.fn().mockResolvedValue({});
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, api: { post: (...args: unknown[]) => post(...args) } };
});

function member(overrides: Partial<MemberData> = {}): MemberData {
  return {
    id: "m1",
    paymentMethod: "بنكيلي",
    paidAmount: 100,
    supportAmount: 0,
    surplusAnonymous: false,
    paymentProof: "old.webp",
    rejectionReason: "الصورة غير واضحة",
    status: "REJECTED",
    ...overrides,
  } as MemberData;
}

afterEach(() => vi.clearAllMocks());

describe("MemberRejected", () => {
  it("names what was refused and why", () => {
    render(<MemberRejected member={member()} onReload={vi.fn()} />);

    expect(screen.getByText("سبب رفض الدفع")).toBeDefined();
    expect(screen.getByText("الصورة غير واضحة")).toBeDefined();
  });

  it("resends the whole amount, fee and surplus together", async () => {
    const onReload = vi.fn();
    render(
      <MemberRejected
        member={member({ paidAmount: 100, supportAmount: 400 })}
        onReload={onReload}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "ارفع" }));
    await userEvent.click(screen.getByRole("button", { name: /إعادة الإرسال/ }));

    await waitFor(() => expect(onReload).toHaveBeenCalled());
    expect(post).toHaveBeenCalledWith("/api/members", {
      id: "m1",
      paymentMethod: "بنكيلي",
      paidAmount: 500,
      surplusAnonymous: false,
      paymentProof: "better.webp",
    });
  });

  it("sends nothing about the person", async () => {
    render(<MemberRejected member={member()} onReload={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "ارفع" }));
    await userEvent.click(screen.getByRole("button", { name: /إعادة الإرسال/ }));

    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(Object.keys(post.mock.calls[0][1])).not.toContain("fullName");
    expect(Object.keys(post.mock.calls[0][1])).not.toContain("age");
    expect(Object.keys(post.mock.calls[0][1])).not.toContain("photo");
  });

  it("sends the member to the payment form to change anything else", async () => {
    render(<MemberRejected member={member()} onReload={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /عدّل الدفع/ }));

    expect(push).toHaveBeenCalledWith("/membership?id=m1");
  });
});
