import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AdminSettingsPage from "./page";
import { paymentMethodManager, settingsForm, settingsPage } from "@/lib/texts";
import { SETTINGS_FIELDS } from "./settingsFields";

const get = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (url: string) => get(url),
    patch: vi.fn(),
    post: vi.fn(),
  },
  errorMessage: (e: unknown) => (e as Error).message,
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
  get.mockReset();
  get.mockImplementation((url: string) =>
    url.startsWith("/api/admin/settings")
      ? Promise.resolve({ settings })
      : Promise.resolve({ methods: [] }),
  );
});

async function shown() {
  const { container } = render(<AdminSettingsPage />);
  await waitFor(() => expect(screen.getByText(settingsForm.membershipFeeLabel)).toBeDefined());
  return container;
}

const at = (container: HTMLElement, text: string) => (container.textContent ?? "").indexOf(text);

describe("the association settings page", () => {
  it("opens on the settings themselves, then the methods, then the export", async () => {
    const container = await shown();

    expect(at(container, settingsForm.membershipGroup)).toBeLessThan(
      at(container, paymentMethodManager.title),
    );
    expect(at(container, paymentMethodManager.title)).toBeLessThan(
      at(container, settingsPage.exportTitle),
    );
  });

  it("groups the fields, in the order the groups are declared", async () => {
    const container = await shown();
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
    const container = await shown();

    const form = container.querySelector("#settings-membershipFee")?.closest("form");

    expect(form?.querySelectorAll("input")).toHaveLength(SETTINGS_FIELDS.length);
    expect(form?.querySelectorAll("button[type=submit]")).toHaveLength(1);
    expect(screen.getByText(settingsPage.save)).toBeDefined();
  });

  it("says nothing above the first card that the tab has not already said", async () => {
    const container = await shown();

    expect(container.querySelector("h1")).toBeNull();
  });
});
