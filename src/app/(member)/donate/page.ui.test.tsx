import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DonatePage from "./page";
import { donate, donorNameChoice } from "@/lib/texts";
import { money } from "@/lib/messages";

let query = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }),
  useSearchParams: () => query,
}));

vi.mock("@/lib/usePayableMethods", () => ({
  usePayableMethods: () => ({
    methods: [{ name: "بنكيلي", accounts: [{ id: "a1", code: "111111", label: null }] }],
    loading: false,
    failed: false,
  }),
}));

const sent: FormData[] = [];

const ACTIVITIES: Record<string, { id: string; title: string; takesGifts: boolean }> = {
  caravan: { id: "caravan", title: "القافلة الصحية", takesGifts: true },
  finished: { id: "finished", title: "دوري الصيف", takesGifts: false },
};

function mockFetch() {
  const fetchMock = vi.fn(async (url: string, init?: { body?: FormData }) => {
    const activity = String(url).match(/^\/api\/activities\/(.+)$/);
    if (activity) {
      const found = ACTIVITIES[activity[1]];
      return found
        ? { ok: true, status: 200, json: async () => ({ activity: found }) }
        : { ok: false, status: 404, json: async () => ({}) };
    }
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
  query = new URLSearchParams();
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

describe("a gift started from an activity", () => {
  it("names the activity it is collecting for", async () => {
    query = new URLSearchParams({ activityId: "caravan" });
    mockFetch();
    await openTheForm();

    expect(screen.getByText(donate.forActivity)).toBeDefined();
    expect(screen.getByText("القافلة الصحية")).toBeDefined();
  });

  it("sends the activity with the gift", async () => {
    query = new URLSearchParams({ activityId: "caravan" });
    mockFetch();
    await openTheForm();
    await fillIn();

    await userEvent.click(screen.getByRole("radio", { name: donorNameChoice.no }));
    await userEvent.click(screen.getByRole("button", { name: donate.submit }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].get("activityId")).toBe("caravan");
  });

  it.each(["finished", "missing"])(
    "turns the giver back to general support when the activity is %s",
    async (id) => {
      query = new URLSearchParams({ activityId: id });
      mockFetch();
      render(<DonatePage />);

      expect(await screen.findByText(donate.activityRefused)).toBeDefined();
      expect(
        screen.getByRole("link", { name: donate.giveToAssociation }).getAttribute("href"),
      ).toBe("/donate");
      expect(screen.queryByText(donate.continueWithout)).toBeNull();
    },
  );

  it("sends no activity from the general form", async () => {
    mockFetch();
    await openTheForm();
    await fillIn();

    await userEvent.click(screen.getByRole("radio", { name: donorNameChoice.no }));
    await userEvent.click(screen.getByRole("button", { name: donate.submit }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].get("activityId")).toBeNull();
    expect(screen.queryByText(donate.forActivity)).toBeNull();
  });
});
