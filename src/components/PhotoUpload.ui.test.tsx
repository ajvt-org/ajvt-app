import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PhotoUpload from "./PhotoUpload";
import { photoUpload } from "@/lib/texts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("a picture that may be changed", () => {
  it("opens the file picker from the frame", async () => {
    render(<PhotoUpload photo="a.webp" onUpload={vi.fn()} />);

    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("sends the uploaded name up", async () => {
    const onUpload = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ filename: "new.webp" }) }),
    );
    const { container } = render(<PhotoUpload photo={null} onUpload={onUpload} />);
    vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:preview" });

    const input = container.querySelector("input[type=file]") as HTMLInputElement;
    await userEvent.upload(input, new File(["x"], "p.png", { type: "image/png" }));

    expect(onUpload).toHaveBeenCalledWith("new.webp");
  });
});

describe("a picture the admin has blocked", () => {
  it("offers nothing to click", () => {
    render(<PhotoUpload photo="a.webp" locked onUpload={vi.fn()} />);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("keeps the file input out of the page", () => {
    const { container } = render(<PhotoUpload photo="a.webp" locked onUpload={vi.fn()} />);

    expect(container.querySelector("input[type=file]")).toBeNull();
  });

  it("says why it cannot be changed", () => {
    render(
      <PhotoUpload photo="a.webp" locked lockedNote="تغيير الصورة موقوف" onUpload={vi.fn()} />,
    );

    expect(screen.getByText("تغيير الصورة موقوف")).toBeTruthy();
  });

  it("still shows the picture that is there", () => {
    const { container } = render(
      <PhotoUpload photo="a.webp" locked variant="hero" onUpload={vi.fn()} />,
    );

    expect(container.querySelector("img")?.getAttribute("src")).toBe("/api/files/a.webp");
  });

  it("blocks the cover and the avatar frames the same way", () => {
    const { rerender } = render(
      <PhotoUpload photo={null} locked variant="cover" onUpload={vi.fn()} />,
    );
    expect(screen.queryByRole("button")).toBeNull();

    rerender(<PhotoUpload photo={null} locked variant="avatar" onUpload={vi.fn()} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("the text beside an avatar", () => {
  it("carries the label and nothing under it", () => {
    render(<PhotoUpload photo={null} onUpload={vi.fn()} label="الصورة" />);

    expect(screen.getByText("الصورة")).toBeTruthy();
    expect(screen.queryByText(photoUpload.add)).toBeNull();
  });

  it("names the hero frame by what pressing it does, so it needs no sentence", () => {
    const { rerender } = render(<PhotoUpload photo={null} variant="hero" onUpload={vi.fn()} />);

    expect(screen.getByRole("button", { name: photoUpload.add })).toBeTruthy();

    rerender(<PhotoUpload photo="a.webp" variant="hero" onUpload={vi.fn()} />);

    expect(screen.getByRole("button", { name: photoUpload.change })).toBeTruthy();
  });

  it("shows the whole picture in the wide frame, over a blurred copy of itself", () => {
    const { container } = render(
      <PhotoUpload photo="a.webp" variant="cover" onUpload={vi.fn()} label="غلاف" />,
    );

    expect(container.querySelector("img.photo-fill-img")).toBeTruthy();
    expect(container.querySelector("img.photo-fill-blur")).toBeTruthy();
    expect(container.querySelector("img.object-cover")).toBeNull();
  });

  it("keeps the small frame cropped, since a contained picture is unreadable there", () => {
    const { container } = render(<PhotoUpload photo="a.webp" onUpload={vi.fn()} label="صورة" />);

    expect(container.querySelector("img.object-cover")).toBeTruthy();
    expect(container.querySelector("img.photo-fill-img")).toBeNull();
  });

  it("says the action on the cover strip rather than under the frame", () => {
    render(<PhotoUpload photo="a.webp" variant="cover" onUpload={vi.fn()} label="غلاف" />);

    const strip = screen.getByText(photoUpload.change);

    expect(strip.closest("button")).toBeTruthy();
  });
});
