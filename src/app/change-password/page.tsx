"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PageHeader from "@/components/PageHeader";
import { api, errorMessage } from "@/lib/api";

// Where a temporary password lands. No tab bar and no way back on purpose: the
// account is locked to this screen until the password is replaced. The old one
// is not asked for, since it was typed minutes ago to get here.
//
// Signing out is the one other way off the page, or someone handed a temporary
// password for the wrong account would be stuck on it.
const MIN_LENGTH = 3;

export default function ChangePasswordPage() {
  const router = useRouter();
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (next !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    if (next.length < MIN_LENGTH) {
      setError(`كلمة المرور يجب أن تكون ${MIN_LENGTH} أحرف على الأقل`);
      return;
    }

    setSaving(true);
    try {
      await api.post("/api/user/password", { newPassword: next });
      router.replace("/home");
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  }

  return (
    <div className="app-shell">
      <PageHeader title="اختر كلمة مرور جديدة" />

      <div className="flex-1 px-5 py-8">
        <form onSubmit={submit} className="card p-5 space-y-4 fade-up">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            دخلت بكلمة مرور مؤقتة. اختر كلمة مرور خاصة بك للمتابعة.
          </p>

          <label className="block">
            <span className="block text-xs font-bold mb-1" style={{ color: "var(--text-muted)" }}>
              كلمة المرور الجديدة
            </span>
            <input
              type="password"
              value={next}
              autoComplete="new-password"
              onChange={(e) => setNext(e.target.value)}
              className="input"
              autoFocus
            />
          </label>

          <label className="block">
            <span className="block text-xs font-bold mb-1" style={{ color: "var(--text-muted)" }}>
              تأكيد كلمة المرور الجديدة
            </span>
            <input
              type="password"
              value={confirm}
              autoComplete="new-password"
              onChange={(e) => setConfirm(e.target.value)}
              className="input"
            />
          </label>

          {error && (
            <p className="text-xs font-semibold" style={{ color: "#dc2626" }}>
              <Icon name="warning" size={13} className="icon-inline" /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || !next || !confirm}
            className="btn btn-primary disabled:opacity-40"
          >
            {saving ? "جاري الحفظ..." : <IconLabel name="save">حفظ ومتابعة</IconLabel>}
          </button>
        </form>

        <button
          onClick={logout}
          className="btn mt-4"
          style={{ background: "transparent", color: "var(--text-muted)" }}
        >
          <IconLabel name="logout">تسجيل الخروج</IconLabel>
        </button>
      </div>
    </div>
  );
}
