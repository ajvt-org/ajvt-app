"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { api, errorMessage } from "@/lib/api";
import { auth } from "@/lib/messages";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";
import { changePassword as texts } from "@/lib/texts";

export default function ChangePasswordForm({ locked }: { locked: boolean }) {
  const router = useRouter();
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (next !== confirm) {
      setError(auth.passwordsDoNotMatch);
      return;
    }
    if (next.length < MIN_PASSWORD_LENGTH) {
      setError(auth.passwordTooShort);
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
    router.refresh();
  }

  return (
    <div className="flex-1 px-5 py-8">
      <form onSubmit={submit} className="card p-5 space-y-4 fade-up">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {locked ? texts.temporaryNote : texts.chooseNote}
        </p>

        <label className="block">
          <span className="block text-xs font-bold mb-1" style={{ color: "var(--text-muted)" }}>
            {texts.newPassword}
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
            {texts.confirmPassword}
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
          {saving ? texts.saving : <IconLabel name="save">{texts.save}</IconLabel>}
        </button>
      </form>

      <button
        onClick={logout}
        className="btn mt-4"
        style={{ background: "transparent", color: "var(--text-muted)" }}
      >
        <IconLabel name="logout">{texts.logout}</IconLabel>
      </button>
    </div>
  );
}
