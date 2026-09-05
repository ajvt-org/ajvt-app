import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HOME_VILLAGE, OTHER_VILLAGE } from "@/lib/villages";
import { photoUpload, signUp } from "@/lib/texts";
import { DRAFT_KEY } from "./draft";
import RegisterPage from "./page";

const push = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: push }),
  useSearchParams: () => new URLSearchParams(search),
}));

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
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("signing up", () => {
  it("asks for the number and the password first", () => {
    mockFetch();
    render(<RegisterPage />);

    expect(screen.queryByLabelText(/رقم الهاتف/)).not.toBeNull();
    expect(screen.queryByLabelText(/الاسم الكامل/)).toBeNull();
  });

  it("refuses to move on when the passwords differ", async () => {
    mockFetch();
    render(<RegisterPage />);

    await userEvent.type(screen.getByLabelText(/رقم الهاتف/), "22119911");
    await userEvent.type(screen.getByLabelText(/^كلمة المرور/), "secret12");
    await userEvent.type(screen.getByLabelText(/تأكيد كلمة المرور/), "different");
    await userEvent.click(screen.getByRole("button", { name: new RegExp(signUp.next) }));

    expect(screen.queryByText(signUp.passwordMismatch)).not.toBeNull();
    expect(screen.queryByLabelText(/الاسم الكامل/)).toBeNull();
  });

  it("asks who you are once the credentials are in", async () => {
    mockFetch();
    render(<RegisterPage />);

    await reachPersonStep();

    expect(screen.queryByLabelText(/الاسم الكامل/)).not.toBeNull();
    expect(screen.queryByLabelText(/القرية/)).not.toBeNull();
  });

  it("asks a member of the home village for an age group", async () => {
    mockFetch();
    render(<RegisterPage />);

    await reachPersonStep();

    await waitFor(() => expect(screen.queryByLabelText(/العصر/)).not.toBeNull());
  });

  it("drops the age group question for a neighbouring village", async () => {
    mockFetch();
    render(<RegisterPage />);
    await reachPersonStep();
    await waitFor(() => expect(screen.getByRole("option", { name: "أفجار" })).toBeDefined());

    await userEvent.selectOptions(screen.getByLabelText(/القرية/), "أفجار");

    expect(screen.queryByLabelText(/العصر/)).toBeNull();
  });

  it("sends the whole person to the register endpoint", async () => {
    const fetchMock = mockFetch();
    render(<RegisterPage />);
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
    render(<RegisterPage />);
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
    render(<RegisterPage />);
    await reachPersonStep();
    await waitFor(() => expect(screen.getByRole("option", { name: "البدريين" })).toBeDefined());

    await userEvent.type(screen.getByLabelText(/الاسم الكامل/), "Mohamed");
    await userEvent.selectOptions(screen.getByLabelText(/العصر/), "البدريين");
    await userEvent.click(screen.getByRole("button", { name: signUp.submit }));

    expect(fetchMock.mock.calls.some((c) => c[0] === "/api/auth/register")).toBe(false);
  });

  it("carries one label for the photo and nothing under it", async () => {
    mockFetch();
    render(<RegisterPage />);
    await reachPersonStep();

    expect(screen.getByText(signUp.photoLabel)).toBeTruthy();
    expect(screen.queryByText(photoUpload.addHint)).toBeNull();
  });

  it("brings back what was typed when the reader comes back to the form", async () => {
    mockFetch();
    const { unmount } = render(<RegisterPage />);
    await userEvent.type(screen.getByLabelText(/رقم الهاتف/), "22119911");
    await waitFor(() => expect(sessionStorage.getItem(DRAFT_KEY)).not.toBeNull());
    unmount();

    render(<RegisterPage />);

    await waitFor(() =>
      expect(screen.getByLabelText(/رقم الهاتف/)).toHaveProperty("value", "22119911"),
    );
  });

  it("never keeps the password, so it has to be typed again", async () => {
    mockFetch();
    const { unmount } = render(<RegisterPage />);
    await userEvent.type(screen.getByLabelText(/رقم الهاتف/), "22119911");
    await userEvent.type(screen.getByLabelText(/^كلمة المرور/), "secret12");
    await userEvent.type(screen.getByLabelText(/تأكيد كلمة المرور/), "secret12");
    await waitFor(() => expect(sessionStorage.getItem(DRAFT_KEY)).toContain("22119911"));

    expect(sessionStorage.getItem(DRAFT_KEY)).not.toContain("secret12");

    unmount();
    render(<RegisterPage />);

    await waitFor(() =>
      expect(screen.getByLabelText(/رقم الهاتف/)).toHaveProperty("value", "22119911"),
    );
    expect(screen.getByLabelText(/^كلمة المرور/)).toHaveProperty("value", "");
  });

  it("brings back the person step answers too", async () => {
    mockFetch();
    const { unmount } = render(<RegisterPage />);
    await reachPersonStep();
    await waitFor(() => expect(screen.getByRole("option", { name: "البدريين" })).toBeDefined());
    await userEvent.type(screen.getByLabelText(/الاسم الكامل/), "محمد");
    await waitFor(() => expect(sessionStorage.getItem(DRAFT_KEY)).toContain("محمد"));
    unmount();

    render(<RegisterPage />);
    await reachPersonStep();

    await waitFor(() =>
      expect(screen.getByLabelText(/الاسم الكامل/)).toHaveProperty("value", "محمد"),
    );
  });

  it("drops the draft once the account exists", async () => {
    mockFetch();
    render(<RegisterPage />);
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
    render(<RegisterPage />);

    expect(screen.getByLabelText("رجوع").getAttribute("href")).toBe("/login");
  });

  it("goes back to the landing page when nothing named an origin", () => {
    mockFetch();
    render(<RegisterPage />);

    expect(screen.getByLabelText("رجوع").getAttribute("href")).toBe("/");
  });
});
