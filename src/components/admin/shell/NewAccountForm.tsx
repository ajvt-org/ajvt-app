"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import Notice from "@/components/Notice";
import { ROLE_LABELS, SUPER_ROLE } from "@/lib/adminRoles";
import { settableRoles } from "@/lib/adminRoleChange";
import { adminAccounts } from "@/lib/texts";

const EMPTY = { username: "", password: "", role: SUPER_ROLE };

export default function NewAccountForm({
  viewerRole,
  onCreated,
}: {
  viewerRole: string | null;
  onCreated: () => Promise<void>;
}) {
  const [form, setForm] = useState(EMPTY);
  const roles = settableRoles(viewerRole);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/api/admin/admins", form);
      setForm(EMPTY);
      await onCreated();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="plus">{adminAccounts.addTitle}</IconLabel>
      </p>
      <input
        type="text"
        placeholder={adminAccounts.username}
        value={form.username}
        onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
        required
        maxLength={30}
        className="input"
      />
      <input
        type="password"
        placeholder={adminAccounts.password}
        value={form.password}
        onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
        required
        className="input"
      />
      <select
        value={form.role}
        onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
        className="input"
      >
        {roles.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {adminAccounts.scopeHint}
      </p>
      {error && <Notice tone="error">{error}</Notice>}
      <button type="submit" disabled={loading} className="btn btn-primary text-sm">
        {loading ? adminAccounts.submitting : adminAccounts.submit}
      </button>
    </form>
  );
}
