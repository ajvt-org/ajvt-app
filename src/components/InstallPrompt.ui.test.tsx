import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import InstallPrompt from "./InstallPrompt";
import { INSTALLED_KEY } from "@/lib/installPrompt";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

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
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const BANNER = "أضف التطبيق لشاشتك الرئيسية";

describe("InstallPrompt", () => {
  it("offers the install in a browser that has not installed it", () => {
    render(<InstallPrompt />);
    offerInstall();

    expect(screen.getByText(BANNER)).toBeDefined();
  });

  it("stays away while the app is running installed", () => {
    displayMode(true);
    render(<InstallPrompt />);
    offerInstall();

    expect(screen.queryByText(BANNER)).toBeNull();
  });

  it("stays away in the browser once the app has been installed", () => {
    localStorage.setItem(INSTALLED_KEY, "1");
    render(<InstallPrompt />);
    offerInstall();

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
