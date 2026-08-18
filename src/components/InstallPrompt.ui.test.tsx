import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import InstallPrompt from "./InstallPrompt";
import { HINTED_KEY, INSTALLED_KEY } from "@/lib/installPrompt";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

function relatedApps(installed: boolean) {
  Object.defineProperty(navigator, "getInstalledRelatedApps", {
    configurable: true,
    writable: true,
    value: () => Promise.resolve(installed ? [{ platform: "webapp" }] : []),
  });
}

function noRelatedApps() {
  Object.defineProperty(navigator, "getInstalledRelatedApps", {
    configurable: true,
    writable: true,
    value: undefined,
  });
}

function displayMode(standalone: boolean) {
  vi.stubGlobal(
    "matchMedia",
    (query: string) => ({ matches: standalone && query.includes("standalone") }) as MediaQueryList,
  );
}

function offerInstall() {
  const event = new Event("beforeinstallprompt");
  Object.assign(event, {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: "accepted" }),
  });
  act(() => {
    window.dispatchEvent(event);
  });
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  displayMode(false);
  noRelatedApps();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const BANNER = "أضف التطبيق لشاشتك الرئيسية";
const HINT = "التطبيق مثبت على جهازك";

describe("InstallPrompt", () => {
  it("offers the install in a browser that has not installed it", async () => {
    render(<InstallPrompt />);
    offerInstall();

    expect(await screen.findByText(BANNER)).toBeDefined();
  });

  it("finds an install that happened before the flag existed", async () => {
    relatedApps(true);
    render(<InstallPrompt />);
    offerInstall();

    expect(await screen.findByText(HINT)).toBeDefined();
    expect(screen.queryByText(BANNER)).toBeNull();
    await waitFor(() => expect(localStorage.getItem(INSTALLED_KEY)).toBe("1"));
  });

  it("still offers the install when the device reports no related app", async () => {
    relatedApps(false);
    render(<InstallPrompt />);
    offerInstall();

    expect(await screen.findByText(BANNER)).toBeDefined();
    expect(localStorage.getItem(INSTALLED_KEY)).toBeNull();
  });

  it("forgets a remembered install once the device says the app is gone", async () => {
    localStorage.setItem(INSTALLED_KEY, "1");
    localStorage.setItem(HINTED_KEY, "1");
    relatedApps(false);
    render(<InstallPrompt />);
    offerInstall();

    expect(await screen.findByText(BANNER)).toBeDefined();
    expect(screen.queryByText(HINT)).toBeNull();
    await waitFor(() => expect(localStorage.getItem(INSTALLED_KEY)).toBeNull());
    expect(localStorage.getItem(HINTED_KEY)).toBeNull();
  });

  it("stays away while the app is running installed", async () => {
    displayMode(true);
    render(<InstallPrompt />);
    offerInstall();

    await waitFor(() => expect(screen.queryByText(BANNER)).toBeNull());
  });

  it("points at the installed app instead of offering it again", async () => {
    localStorage.setItem(INSTALLED_KEY, "1");
    render(<InstallPrompt />);
    offerInstall();

    expect(await screen.findByText(HINT)).toBeDefined();
    expect(screen.queryByText(BANNER)).toBeNull();
    expect(localStorage.getItem(HINTED_KEY)).toBe("1");
  });

  it("points at the installed app only once", async () => {
    localStorage.setItem(INSTALLED_KEY, "1");
    localStorage.setItem(HINTED_KEY, "1");
    render(<InstallPrompt />);

    await waitFor(() => expect(screen.queryByText(HINT)).toBeNull());
  });

  it("says nothing at all inside the installed app", async () => {
    localStorage.setItem(INSTALLED_KEY, "1");
    displayMode(true);
    render(<InstallPrompt />);

    await waitFor(() => expect(screen.queryByText(HINT)).toBeNull());
    expect(screen.queryByText(BANNER)).toBeNull();
  });

  it("remembers an install that happened while the banner was up", async () => {
    render(<InstallPrompt />);
    offerInstall();

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });

    await waitFor(() => expect(localStorage.getItem(INSTALLED_KEY)).toBe("1"));
    expect(screen.queryByText(BANNER)).toBeNull();
  });
});
