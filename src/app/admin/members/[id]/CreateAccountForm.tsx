"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import type { TempPassword } from "@/components/admin/TempPasswordBox";
import { api, errorMessage } from "@/lib/api";
import { memberAccount as texts } from "@/lib/texts";

export default function CreateAccountForm({
  memberId,
  onCreated,
}: {
  memberId: string;
  onCreated: (temp: TempPassword | null) => void;
}) {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    setError("");
    setBusy(true);
    try {
      const data = await api.patch<{ tempPassword?: string; tempPasswordHours?: number }>(
        `/api/admin/members/${memberId}`,
        { accountPhone: phone },
      );
      setPhone("");
      onCreated(
        data.tempPassword
          ? { password: data.tempPassword, hours: data.tempPasswordHours ?? 0 }
          : null,
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold" htmlFor="member-account-phone">
        {texts.phoneLabel}
      </label>
      <div className="flex items-center gap-2">
        <input
          id="member-account-phone"
          type="tel"
          dir="ltr"
          inputMode="numeric"
          maxLength={8}
          value={phone}
          placeholder={texts.phonePlaceholder}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 8))}
          className="input input-sm flex-1 min-w-0"
        />
        <button
          type="button"
          onClick={create}
          disabled={busy || !phone.trim()}
          className="btn btn-sm btn-primary shrink-0"
        >
          {busy ? texts.busy : texts.create}
        </button>
      </div>
      {error && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </p>
      )}
    </div>
  );
}
