"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import Notice from "@/components/Notice";
import { ROLE_LABELS } from "@/lib/adminRoles";
import { SCOPED_ROLE } from "@/lib/activityAccess";

const EMPTY = { username: "", password: "", role: "SUPER" };

const OPEN_ROLES = Object.keys(ROLE_LABELS).filter((role) => role !== SCOPED_ROLE);

export default function NewAccountForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const [form, setForm] = useState(EMPTY);
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
        <IconLabel name="plus">إضافة مشرف جديد</IconLabel>
      </p>
      <input
        type="text"
        placeholder="اسم المستخدم"
        value={form.username}
        onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
        required
        maxLength={30}
        className="input"
      />
      <input
        type="password"
        placeholder="كلمة المرور"
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
        {OPEN_ROLES.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        لحصر مشرف في أنشطة بعينها، أنشئ الحساب ثم اضغط «تحديد الأنشطة» في صفّه — تتحول صلاحيته
        تلقائياً إلى أنشطة محددة فقط.
      </p>
      {error && <Notice tone="error">{error}</Notice>}
      <button type="submit" disabled={loading} className="btn btn-primary text-sm">
        {loading ? "..." : "إضافة"}
      </button>
    </form>
  );
}
