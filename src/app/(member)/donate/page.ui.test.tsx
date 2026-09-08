import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DonatePage from "./page";
import { donate, donorNameChoice } from "@/lib/texts";
import { money } from "@/lib/messages";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/usePayableMethods", () => ({
  usePayableMethods: () => ({
    methods: [{ name: "بنكيلي", accounts: [{ id: "a1", code: "111111", label: null }] }],
    loading: false,
    failed: false,
  }),
}));

const sent: FormData[] = [];

function mockFetch() {
  const fetchMock = vi.fn(async (url: string, init?: { body?: FormData }) => {
    if (String(url).startsWith("/api/donations")) {
      if (init?.body) sent.push(init.body);
      return { ok: true, status: 201, json: async () => ({ ok: true }) };
    }
    return { ok: false, status: 401, json: async () => ({}) };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function openTheForm() {
  render(<DonatePage />);
  await userEvent.click(await screen.findByText(donate.continueWithout));
}

async function fillIn() {
  await userEvent.type(screen.getByPlaceholderText(donate.amountPlaceholder), "5000");
  await userEvent.click(screen.getByRole("radio", { name: /بنكيلي/ }));
  const file = new File([new Uint8Array([1, 2, 3])], "p.png", { type: "image/png" });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await userEvent.upload(input, file);
}

afterEach(() => {
  sent.length = 0;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("a giver with no account", () => {
  it("is asked for a name and separately whether it may be shown", async () => {
    mockFetch();
    await openTheForm();

    expect(screen.getByLabelText(donate.nameLabel)).toBeDefined();
    expect(screen.getByText(donorNameChoice.question)).toBeDefined();
  });

  it("is told the association keeps the name before either answer", async () => {
    mockFetch();
    await openTheForm();

    expect(screen.getByText(donate.nameHint)).toBeDefined();
  });

  it("keeps the name field open after asking to stay anonymous", async () => {
    mockFetch();
    await openTheForm();

    await userEvent.click(screen.getByRole("radio", { name: donorNameChoice.no }));

    expect((screen.getByLabelText(donate.nameLabel) as HTMLInputElement).value).toBe("");
    expect(screen.getByLabelText(donate.nameLabel)).toBeDefined();
  });

  it("sends a name given alongside an anonymous choice", async () => {
    mockFetch();
    await openTheForm();
    await fillIn();

    await userEvent.type(screen.getByLabelText(donate.nameLabel), "محمد ولد أحمد");
    await userEvent.click(screen.getByRole("radio", { name: donorNameChoice.no }));
    await userEvent.click(screen.getByRole("button", { name: donate.submit }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].get("anonymous")).toBe("true");
    expect(sent[0].get("donorName")).toBe("محمد ولد أحمد");
  });

  it("sends no name from a giver who asks to stay anonymous and gives none", async () => {
    mockFetch();
    await openTheForm();
    await fillIn();

    await userEvent.click(screen.getByRole("radio", { name: donorNameChoice.no }));
    await userEvent.click(screen.getByRole("button", { name: donate.submit }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].get("anonymous")).toBe("true");
    expect(sent[0].get("donorName")).toBeNull();
  });

  it("still needs a name from a giver who asks to be shown", async () => {
    mockFetch();
    await openTheForm();
    await fillIn();

    await userEvent.click(screen.getByRole("radio", { name: donorNameChoice.yes }));
    await userEvent.click(screen.getByRole("button", { name: donate.submit }));

    expect(await screen.findByText(money.nameRequired)).toBeDefined();
    expect(sent).toHaveLength(0);
  });

  it("still refuses a giver who never answered the question", async () => {
    mockFetch();
    await openTheForm();
    await fillIn();

    await userEvent.click(screen.getByRole("button", { name: donate.submit }));

    expect(await screen.findByText(money.nameChoiceRequired)).toBeDefined();
    expect(sent).toHaveLength(0);
  });
});
