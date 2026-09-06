import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HOME_VILLAGE, OTHER_VILLAGE } from "@/lib/villages";
import { photoUpload, signUp } from "@/lib/texts";
import { DRAFT_KEY } from "./draft";
import RegisterPage from "./page";

let search = "";
let show: (() => void) | null = null;

const push = vi.fn((href: string) => {
  const query = String(href).indexOf("?");
  search = query === -1 ? "" : String(href).slice(query + 1);
  show?.();
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: push }),
  useSearchParams: () => new URLSearchParams(search),
}));

function renderPage() {
  const view = render(<RegisterPage />);
  show = () => view.rerender(<RegisterPage />);
  return view;
}

function reopenPage() {
  search = "";
  show = null;
  return renderPage();
}

function mockFetch() {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url === "/api/ages") {
      return Promise.resolve({ ok: true, json: async () => ({ ages: ["البدريين"] }) });
    }
    if (url === "/api/villages") {
      return Promise.resolve({
        ok: true,
        json: async () => ({ villages: [HOME_VILLAGE, "أفجار"] }),
      });
    }
    return Promise.resolve({ ok: true, status: 201, json: async () => ({ ok: true }) });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function reachPersonStep() {
  await userEvent.type(screen.getByLabelText(/رقم الهاتف/), "22119911");
  await userEvent.type(screen.getByLabelText(/^كلمة المرور/), "secret12");
  await userEvent.type(screen.getByLabelText(/تأكيد كلمة المرور/), "secret12");
  await userEvent.click(screen.getByRole("button", { name: new RegExp(signUp.next) }));
}

beforeEach(() => {
  push.mockClear();
  search = "";
  show = null;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("signing up", () => {
  it("asks for the number and the password first", () => {
    mockFetch();
    renderPage();

    expect(screen.queryByLabelText(/رقم الهاتف/)).not.toBeNull();
    expect(screen.queryByLabelText(/الاسم الكامل/)).toBeNull();
  });

  it("refuses to move on when the passwords differ", async () => {
    mockFetch();
    renderPage();

    await userEvent.type(screen.getByLabelText(/رقم الهاتف/), "22119911");
    await userEvent.type(screen.getByLabelText(/^كلمة المرور/), "secret12");
    await userEvent.type(screen.getByLabelText(/تأكيد كلمة المرور/), "different");
    await userEvent.click(screen.getByRole("button", { name: new RegExp(signUp.next) }));

    expect(screen.queryByText(signUp.passwordMismatch)).not.toBeNull();
    expect(screen.queryByLabelText(/الاسم الكامل/)).toBeNull();
  });

  it("asks who you are once the credentials are in", async () => {
    mockFetch();
    renderPage();

    await reachPersonStep();

    expect(screen.queryByLabelText(/الاسم الكامل/)).not.toBeNull();
    expect(screen.queryByLabelText(/القرية/)).not.toBeNull();
  });

  it("asks a member of the home village for an age group", async () => {
    mockFetch();
    renderPage();

    await reachPersonStep();

    await waitFor(() => expect(screen.queryByLabelText(/العصر/)).not.toBeNull());
  });

  it("drops the age group question for a neighbouring village", async () => {
    mockFetch();
    renderPage();
    await reachPersonStep();
    await waitFor(() => expect(screen.getByRole("option", { name: "أفجار" })).toBeDefined());

    await userEvent.selectOptions(screen.getByLabelText(/القرية/), "أفجار");

    expect(screen.queryByLabelText(/العصر/)).toBeNull();
  });

  it("sends the whole person to the register endpoint", async () => {
    const fetchMock = mockFetch();
    renderPage();
    await reachPersonStep();
    await waitFor(() => expect(screen.getByRole("option", { name: "البدريين" })).toBeDefined());

    await userEvent.type(screen.getByLabelText(/الاسم الكامل/), "محمد");
    await userEvent.selectOptions(screen.getByLabelText(/العصر/), "البدريين");
    await userEvent.click(screen.getByRole("button", { name: signUp.submit }));

    await waitFor(() => expect(push).toHaveBeenCalled());
    const call = fetchMock.mock.calls.find((c) => c[0] === "/api/auth/register");
    expect(JSON.parse(call![1].body)).toMatchObject({
      phone: "22119911",
      fullName: "محمد",
      village: HOME_VILLAGE,
      age: "البدريين",
    });
  });

  it("sends no age group for a village that has none", async () => {
    const fetchMock = mockFetch();
    renderPage();
    await reachPersonStep();
    await waitFor(() => expect(screen.getByRole("option", { name: "أفجار" })).toBeDefined());

    await userEvent.type(screen.getByLabelText(/الاسم الكامل/), "محمد");
    await userEvent.selectOptions(screen.getByLabelText(/القرية/), OTHER_VILLAGE);
    await userEvent.click(screen.getByRole("button", { name: signUp.submit }));

    await waitFor(() => expect(push).toHaveBeenCalled());
    const call = fetchMock.mock.calls.find((c) => c[0] === "/api/auth/register");
    expect(JSON.parse(call![1].body)).toMatchObject({ village: OTHER_VILLAGE, age: null });
  });

  it("refuses a name that is not written in arabic", async () => {
    const fetchMock = mockFetch();
    renderPage();
    await reachPersonStep();
    await waitFor(() => expect(screen.getByRole("option", { name: "البدريين" })).toBeDefined());

    await userEvent.type(screen.getByLabelText(/الاسم الكامل/), "Mohamed");
    await userEvent.selectOptions(screen.getByLabelText(/العصر/), "البدريين");
    await userEvent.click(screen.getByRole("button", { name: signUp.submit }));

    expect(fetchMock.mock.calls.some((c) => c[0] === "/api/auth/register")).toBe(false);
  });

  it("carries one label for the photo and nothing under it", async () => {
    mockFetch();
    renderPage();
    await reachPersonStep();

    expect(screen.getByText(signUp.photoLabel)).toBeTruthy();
    expect(screen.queryByText(photoUpload.add)).toBeNull();
  });

  it("brings back what was typed when the reader comes back to the form", async () => {
    mockFetch();
    const { unmount } = renderPage();
    await userEvent.type(screen.getByLabelText(/رقم الهاتف/), "22119911");
    await waitFor(() => expect(sessionStorage.getItem(DRAFT_KEY)).not.toBeNull());
    unmount();

    reopenPage();

    await waitFor(() =>
      expect(screen.getByLabelText(/رقم الهاتف/)).toHaveProperty("value", "22119911"),
    );
  });

  it("never keeps the password, so it has to be typed again", async () => {
    mockFetch();
    const { unmount } = renderPage();
    await userEvent.type(screen.getByLabelText(/رقم الهاتف/), "22119911");
    await userEvent.type(screen.getByLabelText(/^كلمة المرور/), "secret12");
    await userEvent.type(screen.getByLabelText(/تأكيد كلمة المرور/), "secret12");
    await waitFor(() => expect(sessionStorage.getItem(DRAFT_KEY)).toContain("22119911"));

    expect(sessionStorage.getItem(DRAFT_KEY)).not.toContain("secret12");

    unmount();
    reopenPage();

    await waitFor(() =>
      expect(screen.getByLabelText(/رقم الهاتف/)).toHaveProperty("value", "22119911"),
    );
    expect(screen.getByLabelText(/^كلمة المرور/)).toHaveProperty("value", "");
  });

  it("brings back the person step answers too", async () => {
    mockFetch();
    const { unmount } = renderPage();
    await reachPersonStep();
    await waitFor(() => expect(screen.getByRole("option", { name: "البدريين" })).toBeDefined());
    await userEvent.type(screen.getByLabelText(/الاسم الكامل/), "محمد");
    await waitFor(() => expect(sessionStorage.getItem(DRAFT_KEY)).toContain("محمد"));
    unmount();

    reopenPage();
    await reachPersonStep();

    await waitFor(() =>
      expect(screen.getByLabelText(/الاسم الكامل/)).toHaveProperty("value", "محمد"),
    );
  });

  it("drops the draft once the account exists", async () => {
    mockFetch();
    renderPage();
    await reachPersonStep();
    await waitFor(() => expect(screen.getByRole("option", { name: "البدريين" })).toBeDefined());
    await userEvent.type(screen.getByLabelText(/الاسم الكامل/), "محمد");
    await userEvent.selectOptions(screen.getByLabelText(/العصر/), "البدريين");
    await userEvent.click(screen.getByRole("button", { name: signUp.submit }));

    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("goes back to the screen that opened the form", () => {
    mockFetch();
    search = "from=%2Flogin";
    renderPage();

    expect(screen.getByLabelText("رجوع").getAttribute("href")).toBe("/login");
  });

  it("gives the person step its own address, so the device button can undo it", async () => {
    mockFetch();
    renderPage();
    await reachPersonStep();

    expect(push).toHaveBeenCalledWith("/register?step=person");
    expect(screen.queryByLabelText(/الاسم الكامل/)).not.toBeNull();
  });

  it("sends the person step's arrow to the step before it", async () => {
    mockFetch();
    renderPage();
    await reachPersonStep();

    expect(screen.getByLabelText("رجوع").getAttribute("href")).toBe("/register");
  });

  it("carries the origin through to the person step", async () => {
    mockFetch();
    search = "from=%2Flogin";
    renderPage();
    await reachPersonStep();

    expect(push).toHaveBeenCalledWith("/register?step=person&from=%2Flogin");
  });

  it("leaves one back affordance on the person step", async () => {
    mockFetch();
    renderPage();
    await reachPersonStep();

    expect(screen.queryByRole("button", { name: signUp.back })).toBeNull();
  });

  it("goes back to the landing page when nothing named an origin", () => {
    mockFetch();
    renderPage();

    expect(screen.getByLabelText("رجوع").getAttribute("href")).toBe("/");
  });
});
