"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import DialogHeader from "@/components/DialogHeader";
import Notice from "@/components/Notice";
import Sheet from "@/components/Sheet";

const FIELDS = [
  { key: "current", label: "كلمة المرور الحالية" },
  { key: "next", label: "كلمة المرور الجديدة" },
  { key: "confirm", label: "تأكيد كلمة المرور الجديدة" },
] as const;

const EMPTY = { current: "", next: "", confirm: "" };

export default function PasswordDialog({
  onBack,
  onClose,
}: {
  onBack: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (form.next !== form.confirm) return setError("كلمتا المرور غير متطابقتين");
    if (form.next.length < 3) return setError("كلمة المرور يجب أن تكون 3 أحرف على الأقل");

    setLoading(true);
    try {
      await api.post("/api/admin/change-password", {
        currentPassword: form.current,
        newPassword: form.next,
      });
      setDone(true);
      setForm(EMPTY);
      setTimeout(onClose, 1500);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet size="sm" onClose={onClose}>
      <DialogHeader title="تغيير كلمة المرور" sticky={false} onBack={onBack} />

      <form onSubmit={submit} className="p-5 space-y-3">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label
              className="block text-sm font-bold mb-1.5"
              style={{ color: "var(--text-main)" }}
              htmlFor={`admin-password-${field.key}`}
            >
              {field.label}
            </label>
            <input
              id={`admin-password-${field.key}`}
              type="password"
              value={form[field.key]}
              onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))}
              required
              className="input"
            />
          </div>
        ))}

        {error && <Notice tone="error">{error}</Notice>}
        {done && <Notice tone="success">تم تغيير كلمة المرور</Notice>}

        <button type="submit" disabled={loading} className="btn btn-primary mt-1">
          {loading ? "..." : "تغيير كلمة المرور"}
        </button>
      </form>
    </Sheet>
  );
}
