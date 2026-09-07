import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { push } from "@/lib/messages";
import { notificationsToggle } from "@/lib/texts/notifications";

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn(async () => ({ categories: [] })), put: vi.fn() },
  errorMessage: (e: unknown) => (e as Error).message,
}));

function browser({ vapid, permission }: { vapid: boolean; permission?: string }) {
  if (vapid) process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-key";
  else delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  vi.stubGlobal("PushManager", class {});
  vi.stubGlobal("Notification", {
    permission: permission ?? "default",
    requestPermission: vi.fn(),
  });
  vi.stubGlobal("navigator", {
    serviceWorker: {
      register: vi.fn(async () => ({ pushManager: { getSubscription: async () => null } })),
    },
  });
}

async function renderToggle(awaitingDecision = false) {
  vi.resetModules();
  const { default: NotificationsToggle } = await import("./NotificationsToggle");
  return render(<NotificationsToggle awaitingDecision={awaitingDecision} />);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("the notifications row", () => {
  it("is absent when the deployment has no VAPID key", async () => {
    browser({ vapid: false });

    const { container } = await renderToggle();

    await waitFor(() => expect(container.innerHTML).toBe(""));
  });

  it("is absent on a browser that cannot take pushes", async () => {
    browser({ vapid: true });
    vi.stubGlobal("navigator", {});

    const { container } = await renderToggle();

    await waitFor(() => expect(container.innerHTML).toBe(""));
  });

  it("shows the switch but no categories while it is off", async () => {
    browser({ vapid: true });

    await renderToggle();

    await waitFor(() => expect(screen.queryByRole("switch")).not.toBeNull());
    expect(screen.queryByText(push.categoriesHeading)).toBeNull();
  });

  it("shows no categories when the browser has blocked notifications", async () => {
    browser({ vapid: true, permission: "denied" });

    await renderToggle();

    const master = await screen.findByRole("switch");
    expect(master.hasAttribute("disabled")).toBe(true);
    expect(screen.queryByText(push.categoriesHeading)).toBeNull();
  });

  it("carries nothing under the label while the switch is off", async () => {
    browser({ vapid: true });

    const { container } = await renderToggle();

    await screen.findByRole("switch");
    expect(container.querySelectorAll("p")).toHaveLength(1);
    expect(screen.getByText(notificationsToggle.label)).not.toBeNull();
  });

  it("sends a blocked reader to the browser settings", async () => {
    browser({ vapid: true, permission: "denied" });

    await renderToggle();

    expect(await screen.findByText(notificationsToggle.blocked)).not.toBeNull();
  });

  it("says what the switch does for somebody waiting on a decision", async () => {
    browser({ vapid: true });

    await renderToggle(true);

    expect(await screen.findByText(notificationsToggle.awaitingDecision)).not.toBeNull();
  });
});
