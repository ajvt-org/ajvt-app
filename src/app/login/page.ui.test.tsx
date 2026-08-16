import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./page";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockClear();
  refresh.mockClear();
});

async function signIn() {
  render(<LoginPage />);
  // By label, not by placeholder: this passes only while the label is really
  // tied to its field, which is also what lets a tap on the label focus it.
  await userEvent.type(screen.getByLabelText("رقم الهاتف"), "22334455");
  await userEvent.type(screen.getByLabelText("كلمة المرور"), "secret123");
  await userEvent.click(screen.getByRole("button", { name: /دخول/ }));
}

describe("signing in", () => {
  // The bottom bar is drawn by a server layout the router caches. Landing on
  // /home without refreshing leaves a signed-in member looking at a visitor's
  // tabs until they reload by hand.
  it("clears the cached layouts on the way to the account", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));

    await signIn();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/home"));
    expect(refresh).toHaveBeenCalled();
  });

  it("stays put when the credentials are refused", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "بيانات غير صحيحة" }) }),
    );

    await signIn();

    await waitFor(() => expect(screen.getByText(/بيانات غير صحيحة/)).toBeDefined());
    expect(push).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
