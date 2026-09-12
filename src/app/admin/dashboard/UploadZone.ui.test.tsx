import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import UploadZone from "./UploadZone";
import { manualAdd, proofCheck } from "@/lib/texts";

describe("UploadZone", () => {
  it("names the field when a form gives it a label", () => {
    render(
      <UploadZone
        label={manualAdd.proofLabel}
        prompt={proofCheck.prompt}
        preview={null}
        alt={proofCheck.prompt}
        uploading={false}
        onPick={vi.fn()}
      />,
    );

    expect(screen.getByText(manualAdd.proofLabel)).toBeDefined();
    expect(screen.getByText(proofCheck.prompt)).toBeDefined();
  });

  it("renders no heading when a screen gives it no label", () => {
    const { container } = render(
      <UploadZone
        prompt={proofCheck.prompt}
        preview={null}
        alt={proofCheck.prompt}
        uploading={false}
        onPick={vi.fn()}
      />,
    );

    expect(container.querySelector("div > p")).toBeNull();
    expect(screen.getByText(proofCheck.prompt)).toBeDefined();
  });
});
