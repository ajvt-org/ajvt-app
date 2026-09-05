import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AccountRow from "./AccountRow";
import { roleTone } from "./roleTone";
import { OWNER_ROLE, ROLE_LABELS, SUPER_ROLE, adminRoleLabel } from "@/lib/adminRoles";
import { SCOPED_ROLE } from "@/lib/activityAccess";
import { adminAccounts } from "@/lib/texts";
import type { AdminAccount, AdminAccountRow } from "./accountTypes";

const ACCOUNT: AdminAccount = {
  id: "a1",
  username: "nurse",
  role: "MEMBERS",
  activities: [],
  lastLoginAt: "2026-08-20T09:30:00.000Z",
  lastLoginIp: "10.0.0.9",
  createdAt: "2026-08-01T09:30:00.000Z",
};

function renderRow(account: AdminAccountRow, props: Record<string, unknown> = {}) {
  const onRole = vi.fn().mockResolvedValue(undefined);
  const { container } = render(
    <AccountRow
      account={account}
      viewerRole={SUPER_ROLE}
      isSelf={false}
      onScope={() => {}}
      onRole={onRole}
      onDelete={() => {}}
      {...props}
    />,
  );
  return { onRole, badge: () => container.querySelector("span.badge") };
}

function setup(account: Partial<AdminAccount> = {}, props: Record<string, unknown> = {}) {
  return renderRow({ ...ACCOUNT, ...account }, props);
}

describe("the role badge", () => {
  it("gives the owner and a full access admin different tones", () => {
    expect(roleTone(OWNER_ROLE).className).not.toBe(roleTone(SUPER_ROLE).className);
  });

  it("gives a full access admin and a quiz only admin different tones", () => {
    expect(roleTone(SUPER_ROLE).className).not.toBe(roleTone("QUIZ").className);
  });

  it("gives every role its own icon", () => {
    const icons = Object.keys(ROLE_LABELS).map((role) => roleTone(role).icon);

    expect(new Set(icons).size).toBe(icons.length);
  });

  it("carries the tone of the role it renders", () => {
    const { badge } = setup({ role: OWNER_ROLE });

    expect(badge()?.textContent).toContain(adminRoleLabel(OWNER_ROLE));
    expect(badge()?.className).toContain(roleTone(OWNER_ROLE).className);
  });

  it("never wraps inside itself, which is what a long username used to force", () => {
    const { badge } = setup({
      role: "QUIZ",
      username: "a-very-long-account-name-that-fills-the-row",
    });

    expect(badge()?.className).toContain("whitespace-nowrap");
    expect(badge()?.className).toContain("shrink-0");
  });

  it("leaves the username to wrap rather than push the badge", () => {
    setup({ username: "a-very-long-account-name-that-fills-the-row" });

    const name = screen.getByText("a-very-long-account-name-that-fills-the-row");
    expect(name.className).toContain("break-words");
    expect(name.parentElement?.className).toContain("min-w-0");
  });
});

describe("the quiet detail", () => {
  it("keeps the address out of the way rather than at the weight of the rest", () => {
    setup();

    expect(screen.getByText("10.0.0.9").closest("details")).not.toBeNull();
  });

  it("keeps the created date out of the way too", () => {
    setup();

    expect(screen.getByText(adminAccounts.moreDetails)).toBeTruthy();
    expect(screen.getByText(/أُنشئ في/).closest("details")).not.toBeNull();
  });

  it("says so plainly when the account has never signed in", () => {
    setup({ lastLoginAt: null, lastLoginIp: null });

    expect(screen.getByText(adminAccounts.neverSignedIn)).toBeTruthy();
  });
});

function openEditor() {
  fireEvent.click(screen.getByRole("button", { name: adminAccounts.changeRole }));
}

describe("the role control", () => {
  it("stays out of the way until it is asked for", () => {
    setup();

    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("opens on the badge rather than in the row the delete button sits in", () => {
    setup();
    openEditor();

    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("is not offered on your own row", () => {
    setup({}, { isSelf: true });

    expect(screen.queryByRole("button", { name: adminAccounts.changeRole })).toBeNull();
  });

  it("withholds the owner role from a full access admin", () => {
    setup();
    openEditor();

    expect(screen.getByRole("combobox").textContent).not.toContain(ROLE_LABELS[OWNER_ROLE]);
  });

  it("offers the owner role to an owner", () => {
    setup({}, { viewerRole: OWNER_ROLE });
    openEditor();

    expect(screen.getByRole("combobox").textContent).toContain(ROLE_LABELS[OWNER_ROLE]);
  });

  it("shows the role the account already holds even when it is not on offer", () => {
    setup({ role: SCOPED_ROLE });
    openEditor();

    expect(screen.getByRole("combobox").textContent).toContain(ROLE_LABELS[SCOPED_ROLE]);
  });

  it("asks for a second press rather than changing on the pick", () => {
    const { onRole } = setup();
    openEditor();

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "QUIZ" },
    });

    expect(onRole).not.toHaveBeenCalled();
  });

  it("has nothing to apply until the pick differs from the role held", () => {
    setup();
    openEditor();

    expect(screen.getByText(adminAccounts.applyRole).closest("button")!.disabled).toBe(true);
  });

  it("sends the picked role once the press lands", () => {
    const { onRole } = setup();
    openEditor();

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "QUIZ" },
    });
    fireEvent.click(screen.getByText(adminAccounts.applyRole));

    expect(onRole).toHaveBeenCalledWith("QUIZ");
  });

  it("puts the badge back when the change is abandoned", () => {
    const { badge } = setup();
    openEditor();

    fireEvent.click(screen.getByText(adminAccounts.cancelRole));

    expect(badge()).not.toBeNull();
  });

  it("shows why the change was refused rather than swallowing it", async () => {
    const onRole = vi.fn().mockRejectedValue(new Error("لا يمكنك تغيير صلاحية حسابك الخاص"));
    render(
      <AccountRow
        account={ACCOUNT}
        viewerRole={SUPER_ROLE}
        isSelf={false}
        onScope={() => {}}
        onRole={onRole}
        onDelete={() => {}}
      />,
    );

    openEditor();
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "QUIZ" },
    });
    fireEvent.click(screen.getByText(adminAccounts.applyRole));

    expect(await screen.findByText("لا يمكنك تغيير صلاحية حسابك الخاص")).toBeTruthy();
  });
});

describe("the two actions", () => {
  it("does not leave the destructive one beside the rest", () => {
    setup();

    expect(screen.getByText(adminAccounts.remove).closest("button")?.className).toContain(
      "ms-auto",
    );
  });

  it("keeps the role control out of the row the delete button sits in", () => {
    setup();
    openEditor();

    const remove = screen.getByText(adminAccounts.remove).closest("button");
    const select = screen.getByRole("combobox");
    expect(remove?.parentElement?.contains(select)).toBe(false);
  });
});

describe("a row the viewer is only given a username for", () => {
  const SUMMARY = { id: "a2", username: "chief" };

  it("prints the username", () => {
    renderRow(SUMMARY);

    expect(screen.getByText("chief")).toBeTruthy();
  });

  it("carries no role badge", () => {
    const { badge } = renderRow(SUMMARY);

    expect(badge()).toBeNull();
  });

  it("offers neither the details nor the two actions", () => {
    renderRow(SUMMARY);

    expect(screen.queryByText(adminAccounts.moreDetails)).toBeNull();
    expect(screen.queryByText(adminAccounts.scope)).toBeNull();
    expect(screen.queryByText(adminAccounts.remove)).toBeNull();
  });

  it("says nothing about when the account last signed in", () => {
    renderRow(SUMMARY);

    expect(screen.queryByText(adminAccounts.neverSignedIn)).toBeNull();
    expect(screen.queryByText(new RegExp(adminAccounts.lastLogin))).toBeNull();
  });
});
