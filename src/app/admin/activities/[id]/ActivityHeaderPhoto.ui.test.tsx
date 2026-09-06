import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivityHeaderPhoto from "./ActivityHeaderPhoto";
import { ToastProvider } from "@/components/Toast";
import { activityForm as texts } from "@/lib/texts";

const patch = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { patch: (...args: unknown[]) => patch(...args) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

function show(photo: string | null, onSaved = vi.fn()) {
  render(
    <ToastProvider>
      <ActivityHeaderPhoto activityId="a1" photo={photo} isVolunteer={false} onSaved={onSaved} />
    </ToastProvider>,
  );
  return { onSaved };
}

beforeEach(() => {
  patch.mockReset();
  patch.mockResolvedValue({});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the activity photo in the header", () => {
  it("shows the thumbnail of the picture that is there", () => {
    const { container } = render(
      <ToastProvider>
        <ActivityHeaderPhoto activityId="a1" photo="p.webp" isVolunteer={false} onSaved={vi.fn()} />
      </ToastProvider>,
    );

    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "/api/files/activity/p-thumb.webp",
    );
  });

  it("offers the placeholder as the thing to press when there is no picture", () => {
    show(null);

    expect(screen.getByRole("button", { name: texts.activityPhoto })).toBeTruthy();
  });

  it("saves the picture on its own, without the details form", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ filename: "new.webp" }) }),
    );
    vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:preview" });
    const { container } = render(
      <ToastProvider>
        <ActivityHeaderPhoto activityId="a1" photo={null} isVolunteer={false} onSaved={vi.fn()} />
      </ToastProvider>,
    );

    const input = container.querySelector("input[type=file]") as HTMLInputElement;
    await userEvent.upload(input, new File(["x"], "p.png", { type: "image/png" }));

    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patch.mock.calls[0][0]).toBe("/api/admin/activities/a1");
    expect(patch.mock.calls[0][1]).toEqual({ photo: "new.webp" });
  });

  it("reloads the page data so the header shows what was saved", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ filename: "new.webp" }) }),
    );
    vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:preview" });
    const onSaved = vi.fn();
    const { container } = render(
      <ToastProvider>
        <ActivityHeaderPhoto activityId="a1" photo={null} isVolunteer={false} onSaved={onSaved} />
      </ToastProvider>,
    );

    const input = container.querySelector("input[type=file]") as HTMLInputElement;
    await userEvent.upload(input, new File(["x"], "p.png", { type: "image/png" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });
});
