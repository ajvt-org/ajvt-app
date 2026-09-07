"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { api, errorMessage } from "@/lib/api";
import { accountPhone as texts } from "@/lib/texts";

export default function AccountPhoneForm({
  memberId,
  phone,
  onChanged,
}: {
  memberId: string;
  phone: string | null;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");
    setSaving(true);
    try {
      await api.patch(`/api/admin/members/${memberId}/account`, { phone: value });
      setEditing(false);
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          {texts.label}
        </span>
        <span className="flex items-center gap-2">
          {phone ? (
            <span className="font-bold text-sm" dir="ltr">
              {phone}
            </span>
          ) : (
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              {texts.none}
            </span>
          )}
          <button
            onClick={() => {
              setValue(phone ?? "");
              setError("");
              setEditing(true);
            }}
            className="btn btn-sm btn-ghost font-bold"
          >
            <IconLabel name={phone ? "pencil" : "plus"}>{phone ? texts.edit : texts.add}</IconLabel>
          </button>
        </span>
      </div>
    );
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
        <button onClick={() => setEditing(false)} className="btn btn-sm btn-ghost">
          {texts.cancel}
        </button>
      </div>
    </div>
  );
}
