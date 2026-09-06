"use client";

import { useState } from "react";
import IconLabel from "@/components/IconLabel";
import Notice from "@/components/Notice";
import { api, errorMessage } from "@/lib/api";
import { supportPrivacy as texts } from "@/lib/texts";

export default function SupportPrivacyCard({
  memberId,
  confidential,
  namedEntries,
  onChanged,
}: {
  memberId: string;
  confidential: boolean;
  namedEntries: number;
  onChanged: () => void;
}) {
  const [checked, setChecked] = useState(confidential);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [entries, setEntries] = useState<number | null>(null);

  async function save(next: boolean) {
    setChecked(next);
    setSaving(true);
    setError("");
    try {
      const result = await api.put<{ confidential: boolean; namedEntries: number }>(
        `/api/admin/members/${memberId}/support-privacy`,
        { confidential: next },
      );
      setEntries(next ? result.namedEntries : null);
      onChanged();
    } catch (e) {
      setChecked(!next);
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const shown = entries ?? (confidential ? namedEntries : null);

  return (
    <section className="card p-4 space-y-2">
      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          checked={checked}
          disabled={saving}
          onChange={(e) => save(e.target.checked)}
        />
        <IconLabel name="ban">{texts.checkbox}</IconLabel>
      </label>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {texts.hint}
      </p>
      {shown !== null && (
        <Notice tone="success">
          {shown > 0 ? texts.existingEntries(shown) : texts.noExistingEntries}
        </Notice>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </section>
  );
}
