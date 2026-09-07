import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import AdminSettingsPage from "./page";
import { paymentMethodManager, settingsForm, settingsPage } from "@/lib/texts";
import { SETTINGS_FIELDS } from "./settingsFields";

const get = vi.fn();
const replace = vi.fn();
let query = "";

vi.mock("@/lib/api", () => ({
  api: {
    get: (url: string) => get(url),
    patch: vi.fn(),
    post: vi.fn(),
  },
  errorMessage: (e: unknown) => (e as Error).message,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(query),
}));

const settings = {
  membershipFee: 1000,
  membershipYear: 2026,
  tempPasswordHours: 48,
  supportWhatsapp: "22200000",
  whatsappGroup: "",
  secretaryName: "",
  treasurerName: "",
};

beforeEach(() => {
  cleanup();
  query = "";
  replace.mockReset();
  get.mockReset();
  get.mockImplementation((url: string) =>
    url.startsWith("/api/admin/settings")
      ? Promise.resolve({ settings })
      : Promise.resolve({ methods: [] }),
  );
});

function shown(tab = "") {
  cleanup();
  query = tab ? `tab=${tab}` : "";
  return render(<AdminSettingsPage />).container;
}

async function onTheForm() {
  const container = shown();
  await waitFor(() => expect(screen.getByText(settingsForm.membershipFeeLabel)).toBeDefined());
  return container;
}

const at = (container: HTMLElement, text: string) => (container.textContent ?? "").indexOf(text);
const tabsOf = (container: HTMLElement) => [
  ...(container.querySelector(".tab-strip") as HTMLElement).querySelectorAll("button"),
];

describe("the three subjects الإعدادات holds", () => {
  it("offers them in one strip, the settings then the methods then the export", async () => {
    const container = await onTheForm();

    expect(tabsOf(container).map((b) => b.textContent?.trim())).toEqual([
      settingsPage.settingsTab,
      paymentMethodManager.title,
      settingsPage.exportTab,
    ]);
  });

  it("names the export in full inside its own block", () => {
    const container = shown("export");

    expect(at(container, settingsPage.exportTitle)).toBeGreaterThan(-1);
  });

  it("draws one strip, since three tabs are one section", async () => {
    const container = await onTheForm();

    expect(container.querySelectorAll(".tab-strip")).toHaveLength(1);
  });

  it("shows one block at a time", async () => {
    const form = await onTheForm();
    expect(form.querySelector("#settings-membershipFee")).not.toBeNull();
    expect(form.querySelector("a[href='/api/admin/export/members']")).toBeNull();
    expect(screen.queryByLabelText(paymentMethodManager.newLabel)).toBeNull();

    const methods = shown("methods");
    await waitFor(() => expect(screen.getByLabelText(paymentMethodManager.newLabel)).toBeDefined());
    expect(methods.querySelector("#settings-membershipFee")).toBeNull();
    expect(methods.querySelector("a[href='/api/admin/export/members']")).toBeNull();

    const exported = shown("export");
    expect(exported.querySelector("#settings-membershipFee")).toBeNull();
    expect(exported.querySelector("a[href='/api/admin/export/members']")).not.toBeNull();
    expect(screen.queryByLabelText(paymentMethodManager.newLabel)).toBeNull();
  });

  it("asks the server for nothing the tab being read does not need", () => {
    shown("export");

    expect(get).not.toHaveBeenCalled();
  });

  it("lands on the settings when the address names no tab", async () => {
    const container = await onTheForm();

    expect(container.querySelector("#settings-membershipFee")).not.toBeNull();
  });

  it("falls back to the settings when the address names a tab that is not there", async () => {
    const container = shown("nowhere");
    await waitFor(() => expect(screen.getByText(settingsForm.membershipFeeLabel)).toBeDefined());

    expect(container.querySelector("#settings-membershipFee")).not.toBeNull();
  });

  it("writes the chosen tab into the address so a reload lands on it", async () => {
    const container = await onTheForm();

    fireEvent.click(tabsOf(container)[2]);

    expect(replace).toHaveBeenCalledWith("/admin/settings?tab=export", { scroll: false });
  });

  it("marks the tab being read", () => {
    const container = shown("methods");
    const marked = tabsOf(container).filter((b) => b.getAttribute("aria-current") === "page");

    expect(marked.map((b) => b.textContent?.trim())).toEqual([paymentMethodManager.title]);
  });
});

describe("the association settings form", () => {
  it("groups the fields, in the order the groups are declared", async () => {
    const container = await onTheForm();
    const marks = [
      settingsForm.membershipGroup,
      settingsForm.accessGroup,
      settingsForm.channelsGroup,
      settingsForm.officersGroup,
    ].map((title) => at(container, title));

    expect(marks).toEqual([...marks].sort((a, b) => a - b));
    expect(marks.every((mark) => mark >= 0)).toBe(true);
  });

  it("carries one save for the whole form", async () => {
    const container = await onTheForm();

    const form = container.querySelector("#settings-membershipFee")?.closest("form");

    expect(form?.querySelectorAll("input")).toHaveLength(SETTINGS_FIELDS.length);
    expect(form?.querySelectorAll("button[type=submit]")).toHaveLength(1);
    expect(screen.getByText(settingsPage.save)).toBeDefined();
  });

  it("leaves the fee and the support number to their own labels", async () => {
    const container = await onTheForm();

    for (const key of ["membershipFee", "supportWhatsapp"]) {
      const input = container.querySelector(`#settings-${key}`) as HTMLElement;
      expect(input.parentElement?.querySelector("p")).toBeNull();
    }
  });

  it("keeps the line that says where an officer name is printed", async () => {
    const container = await onTheForm();

    const input = container.querySelector("#settings-treasurerName") as HTMLElement;
    expect(input.parentElement?.querySelector("p")?.textContent).toBe(settingsForm.officerHint);
  });

  it("says nothing above the strip that the tab has not already said", async () => {
    const container = await onTheForm();

    expect(container.querySelector("h1")).toBeNull();
  });
});
