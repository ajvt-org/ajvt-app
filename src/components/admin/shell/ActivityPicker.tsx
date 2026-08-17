"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import DialogHeader from "@/components/DialogHeader";
import IconLabel from "@/components/IconLabel";
import Notice from "@/components/Notice";
import type { ActivityOption, AdminAccount } from "./accountTypes";

function fetchActivities(): Promise<ActivityOption[]> {
  return api
    .get<{ activities: ActivityOption[] }>("/api/admin/activities")
    .then((data) => (data.activities || []).map((a) => ({ id: a.id, title: a.title })))
    .catch(() => []);
}

export default function ActivityPicker({
  account,
  onBack,
  onSaved,
}: {
  account: AdminAccount;
  onBack: () => void;
  onSaved: () => Promise<void>;
}) {
  const [options, setOptions] = useState<ActivityOption[]>([]);
  const [chosen, setChosen] = useState<string[]>(account.activities.map((a) => a.id));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchActivities().then(setOptions);
  }, []);

  function toggle(id: string) {
    setChosen((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function save() {
    setError("");
    setSaving(true);
    try {
      await api.put(`/api/admin/admins/${account.id}/activities`, { activityIds: chosen });
      await onSaved();
      onBack();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader
        title={<IconLabel name="trophy">أنشطة {account.username}</IconLabel>}
        onBack={onBack}
      />

      <div className="p-5 space-y-4">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          الحساب سيرى الأنشطة المختارة فقط، ولن يصل إلى بقية لوحة التحكم.
        </p>

        <div className="space-y-2">
          {options.map((option) => (
            <label key={option.id} className="card p-3 flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={chosen.includes(option.id)}
                onChange={() => toggle(option.id)}
              />
              <span className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
                {option.title}
              </span>
            </label>
          ))}
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        <button
          onClick={save}
          disabled={saving || chosen.length === 0}
          className="btn btn-primary text-sm"
        >
          {saving ? "..." : "حفظ"}
        </button>
      </div>
    </>
  );
}
