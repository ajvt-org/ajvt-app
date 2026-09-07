"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { api, errorMessage } from "@/lib/api";
import { memberAccount as texts } from "@/lib/texts";
import TempPasswordBox from "@/app/admin/dashboard/TempPasswordBox";
import AccountPhoneForm from "./AccountPhoneForm";

interface Temp {
  password: string;
  hours: number;
}

function CreateAccount({
  memberId,
  onCreated,
}: {
  memberId: string;
  onCreated: (temp: Temp | null) => void;
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
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {texts.none}
      </p>
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

function ResetPassword({ userId, onReset }: { userId: string; onReset: (temp: Temp) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function reset() {
    setError("");
    setBusy(true);
    try {
      const data = await api.post<{ tempPassword: string; hours: number }>(
        "/api/admin/reset-password",
        { userId },
      );
      onReset({ password: data.tempPassword, hours: data.hours });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          {texts.password}
        </span>
        <button
          type="button"
          onClick={reset}
          disabled={busy}
          className="btn btn-sm btn-ghost shrink-0"
        >
          {busy ? texts.busy : texts.reset}
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

export default function MemberAccountCard({
  memberId,
  userId,
  phone,
  onChanged,
}: {
  memberId: string;
  userId: string | null;
  phone: string | null;
  onChanged: () => void;
}) {
  const [temp, setTemp] = useState<Temp | null>(null);

  if (!userId) {
    return (
      <>
        <CreateAccount
          memberId={memberId}
          onCreated={(made) => {
            setTemp(made);
            onChanged();
          }}
        />
        {temp && <TempPasswordBox value={temp.password} hours={temp.hours} />}
      </>
    );
  }

  return (
    <div className="space-y-2">
      <AccountPhoneForm memberId={memberId} phone={phone} onChanged={onChanged} />
      <ResetPassword userId={userId} onReset={setTemp} />
      {temp && <TempPasswordBox value={temp.password} hours={temp.hours} />}
    </div>
  );
}
