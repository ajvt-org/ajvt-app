"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import Notice from "@/components/Notice";
import { ROLE_LABELS } from "@/lib/adminRoles";
import { SCOPED_ROLE } from "@/lib/activityAccess";
import { activityPicker as texts } from "@/lib/texts";
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
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="trophy">{texts.title(account.username)}</IconLabel>
        </p>
        <button
          onClick={onBack}
          className="text-xs font-bold shrink-0"
          style={{ color: "var(--mint-700)" }}
        >
          <IconLabel name="chevronLeft">{texts.back}</IconLabel>
        </button>
      </div>

      <div className="space-y-4">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.scope(ROLE_LABELS[SCOPED_ROLE])}
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
          {saving ? texts.saving : texts.save}
        </button>
      </div>
    </>
  );
}
