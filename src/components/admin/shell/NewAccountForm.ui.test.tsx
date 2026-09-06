import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NewAccountForm from "./NewAccountForm";
import { OWNER_ROLE, ROLE_LABELS, SUPER_ROLE } from "@/lib/adminRoles";

const OWNER_LABEL = ROLE_LABELS[OWNER_ROLE];

function setup(viewerRole: string | null) {
  render(<NewAccountForm viewerRole={viewerRole} onCreated={async () => {}} />);
  return screen.getByRole("combobox");
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("NewAccountForm", () => {
  it("does not offer the owner role to a full access admin", () => {
    const select = setup(SUPER_ROLE);

    expect(select.textContent).not.toContain(OWNER_LABEL);
  });

  it("does not offer the owner role before the viewer role is known", () => {
    const select = setup(null);

    expect(select.textContent).not.toContain(OWNER_LABEL);
  });

  it("offers the owner role to an owner", () => {
    const select = setup(OWNER_ROLE);

    expect(select.textContent).toContain(OWNER_LABEL);
  });

  it("never offers the scoped role, which is set by picking activities", () => {
    const select = setup(OWNER_ROLE);

    expect(select.textContent).not.toContain(ROLE_LABELS.ACTIVITY);
  });

  it("describes no control it does not have", () => {
    const { container } = render(
      <NewAccountForm viewerRole={OWNER_ROLE} onCreated={async () => {}} />,
    );

    expect(container.querySelectorAll("p.text-xs")).toHaveLength(0);
  });
});
