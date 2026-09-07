"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { api, errorMessage } from "@/lib/api";
import { accountPhone as texts } from "@/lib/texts";

export default function AccountPhoneForm({
  memberId,
  phone,
  onSaved,
  onCancel,
}: {
  memberId: string;
  phone: string | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");
    setSaving(true);
    try {
      await api.patch(`/api/admin/members/${memberId}/account`, { phone: value });
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold" htmlFor="account-phone">
        {texts.label}
      </label>
      <input
        id="account-phone"
        type="tel"
        dir="ltr"
        inputMode="numeric"
        maxLength={8}
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 8))}
        className="input"
      />
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {phone ? texts.hint : texts.noneHint}
      </p>
      {error && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button onClick={save} disabled={saving} className="btn btn-sm btn-primary">
          {saving ? "..." : texts.save}
        </button>
        <button onClick={onCancel} className="btn btn-sm btn-ghost">
          {texts.cancel}
        </button>
      </div>
    </div>
  );
}
