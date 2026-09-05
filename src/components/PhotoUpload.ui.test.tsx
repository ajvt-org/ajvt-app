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
  it("carries the label and the hint by default", () => {
    render(<PhotoUpload photo={null} onUpload={vi.fn()} label="الصورة" />);

    expect(screen.getByText("الصورة")).toBeTruthy();
    expect(screen.getByText(photoUpload.addHint)).toBeTruthy();
  });

  it("keeps the label and drops the hint when the call site asks", () => {
    render(<PhotoUpload photo={null} onUpload={vi.fn()} label="الصورة" showHint={false} />);

    expect(screen.getByText("الصورة")).toBeTruthy();
    expect(screen.queryByText(photoUpload.addHint)).toBeNull();
  });
});
