import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MembershipPage from "./page";
import { DRAFT_KEY } from "./constants";
import { stepPayment } from "@/lib/texts";
import { members, money } from "@/lib/messages";

const router = { push: vi.fn(), replace: vi.fn() };
const params = new URLSearchParams("");

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => params,
}));

vi.mock("@/components/ProofUpload", () => ({
  default: ({ onUploaded }: { onUploaded: (name: string) => void }) => (
    <button type="button" onClick={() => onUploaded("proof.jpg")}>
      attach
    </button>
  ),
}));

const FEE = 700;

const OLD_DRAFT = {
  fullName: "x",
  phone: "22200000",
  village: "y",
  age: "z",
  paymentMethod: "بنكيلي",
  paidAmount: "700",
  referenceCode: "AB12CD",
};

const KEPT = ["accountId", "bankReference", "paidAmount", "paymentMethod", "referenceCode"];

function reply(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

function stubFetch() {
  const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
    if (url === "/api/user/me") return reply({ fullName: "سالم", members: [] });
    if (url === "/api/settings") {
      return reply({
        settings: { membershipFee: FEE, asksBankReference: false, showsReferenceCode: false },
      });
    }
    if (url === "/api/payment-methods")
      return reply({ methods: [{ name: "بنكيلي", accounts: [] }] });
    return reply({});
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function openWithDraft(draft: string) {
  localStorage.setItem(DRAFT_KEY, draft);
  const fetchMock = stubFetch();
  const user = userEvent.setup();
  render(<MembershipPage />);
  const attach = await screen.findByRole("button", { name: "attach" });
  return { fetchMock, user, attach };
}

async function send(user: ReturnType<typeof userEvent.setup>, attach: HTMLElement) {
  await user.click(attach);
  await user.click(screen.getByRole("button", { name: new RegExp(stepPayment.send) }));
}

const posted = (fetchMock: ReturnType<typeof stubFetch>) =>
  fetchMock.mock.calls.find(([url]) => url === "/api/members");

beforeEach(() => {
  localStorage.clear();
});

describe("the membership form restoring a draft the browser kept", () => {
  it("sends a draft written before the transaction number field existed", async () => {
    const { fetchMock, user, attach } = await openWithDraft(JSON.stringify(OLD_DRAFT));
    await send(user, attach);

    await waitFor(() => expect(posted(fetchMock)).toBeTruthy());
    expect(screen.queryByText(/Cannot read properties/)).toBeNull();
    const body = JSON.parse(posted(fetchMock)![1]!.body as string);
    expect(body.bankReference).toBeNull();
    expect(body.paidAmount).toBe(FEE);
    expect(body.paymentMethod).toBe("بنكيلي");
  });

  it("stops writing the keys the form no longer holds back to the browser", async () => {
    await openWithDraft(JSON.stringify(OLD_DRAFT));

    await waitFor(
      () => {
        const written = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}");
        expect(Object.keys(written).sort()).toEqual(KEPT);
      },
      { timeout: 2000 },
    );
  });

  it("still gives a working form when what was stored is not JSON", async () => {
    const { fetchMock, user, attach } = await openWithDraft("{not json");
    await send(user, attach);

    await waitFor(() => expect(screen.getByText(members.pickPaymentMethod)).toBeTruthy());
    expect(screen.getByText(stepPayment.methodLabel)).toBeTruthy();
    expect(posted(fetchMock)).toBeFalsy();
  });

  it("does not carry a stored value of the wrong type into the request", async () => {
    const draft = { ...OLD_DRAFT, paidAmount: FEE, bankReference: 12345 };
    const { fetchMock, user, attach } = await openWithDraft(JSON.stringify(draft));
    await send(user, attach);

    await waitFor(() => expect(screen.getByText(money.paidAmountTooLow(FEE))).toBeTruthy());
    expect(posted(fetchMock)).toBeFalsy();
  });
});
