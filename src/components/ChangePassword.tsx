"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { api, errorMessage } from "@/lib/api";

// Collapsed until asked for, because most visits to the profile are not about
// the password and three empty fields sitting open read as something to fill in.
const MIN_LENGTH = 3;

const EMPTY = { current: "", next: "", confirm: "" };

export default function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function close() {
    setOpen(false);
    setForm(EMPTY);
    setError("");
  }

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (form.next !== form.confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    if (form.next.length < MIN_LENGTH) {
      setError(`كلمة المرور يجب أن تكون ${MIN_LENGTH} أحرف على الأقل`);
      return;
    }

    setSaving(true);
    try {
      await api.post("/api/user/password", {
        currentPassword: form.current,
        newPassword: form.next,
      });
      setForm(EMPTY);
      setDone(true);
      setOpen(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <div className="card p-4 flex items-center justify-between gap-3">
        <p
          className="text-sm font-bold min-w-0 label-optical"
          style={{ color: "var(--text-main)" }}
        >
          <IconLabel name="lock">{done ? "تم تغيير كلمة المرور" : "كلمة المرور"}</IconLabel>
        </p>
        <button
          onClick={() => {
            setDone(false);
            setOpen(true);
          }}
          className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          تغيير
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="lock">تغيير كلمة المرور</IconLabel>
      </p>

      <Field
        label="كلمة المرور الحالية"
        value={form.current}
        autoComplete="current-password"
        onChange={(v) => setForm({ ...form, current: v })}
      />
      <Field
        label="كلمة المرور الجديدة"
        value={form.next}
        autoComplete="new-password"
        onChange={(v) => setForm({ ...form, next: v })}
      />
      <Field
        label="تأكيد كلمة المرور الجديدة"
        value={form.confirm}
        autoComplete="new-password"
        onChange={(v) => setForm({ ...form, confirm: v })}
      />

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        سيتم تسجيل الخروج من الأجهزة الأخرى.
      </p>

      {error && (
        <p className="text-xs font-semibold" style={{ color: "#dc2626" }}>
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !form.current || !form.next}
          className="btn btn-primary flex-1 disabled:opacity-40"
        >
          {saving ? "جاري الحفظ..." : <IconLabel name="save">حفظ</IconLabel>}
        </button>
        <button
          type="button"
          onClick={close}
          className="btn"
          style={{
            background: "var(--mint-100)",
            color: "var(--mint-700)",
            // .btn is width:100%, which a flex item takes as its basis and then
            // refuses to shrink below. Sized to its label instead.
            width: "auto",
            flex: "0 0 auto",
          }}
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  autoComplete,
  onChange,
}: {
  label: string;
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <input
        type="password"
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      />
    </label>
  );
}
