"use client";

import { useState } from "react";
import PhotoUpload from "@/components/PhotoUpload";
import IconLabel from "@/components/IconLabel";
import { errorMessage } from "@/lib/api";
import type { IconName } from "@/components/Icon";
import TournamentSetupFields from "./TournamentSetupFields";
import {
  emptyNewActivity,
  natureOf,
  withNature,
  type ActivityNature,
  type NewActivityDraft,
} from "./activityTypes";

const NATURES: { value: ActivityNature; label: string; hint: string; icon: IconName }[] = [
  { value: "normal", label: "نشاط عادي", hint: "تسجيل أعضاء وحضور", icon: "calendar" },
  { value: "tournament", label: "بطولة", hint: "فرق ومباريات وترتيب وهدافون", icon: "trophy" },
  {
    value: "volunteer",
    label: "حملة تطوعية",
    hint: "بدون تسجيل داخل التطبيق — رابط واتساب مباشر",
    icon: "handshake",
  },
];

export default function NewActivityForm({
  onCreate,
}: {
  onCreate: (draft: NewActivityDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<NewActivityDraft>(emptyNewActivity());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onCreate(draft);
      setDraft(emptyNewActivity());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-3">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="plus">إضافة نشاط جديد</IconLabel>
      </p>
      <PhotoUpload
        photo={draft.photo || null}
        imageUrlPrefix="/api/files/activity"
        variant="avatar"
        label={draft.isTournament ? "شعار البطولة" : "صورة النشاط"}
        placeholderIcon="image"
        onUpload={(filename) => setDraft((p) => ({ ...p, photo: filename }))}
      />
      <input
        type="text"
        placeholder="عنوان النشاط"
        value={draft.title}
        onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
        required
        maxLength={60}
        className="input"
      />
      <textarea
        placeholder="الوصف"
        value={draft.description}
        onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
        required
        maxLength={1000}
        rows={3}
        className="input"
      />
      <div className="flex items-center gap-2 flex-wrap">
        <label
          className="text-xs shrink-0"
          style={{ color: "var(--text-muted)" }}
          htmlFor="activity-field-1"
        >
          من
        </label>
        <input
          id="activity-field-1"
          type="date"
          value={draft.startsAt}
          onChange={(e) => setDraft((p) => ({ ...p, startsAt: e.target.value }))}
          className="input flex-1 min-w-0"
        />
        <label
          className="text-xs shrink-0"
          style={{ color: "var(--text-muted)" }}
          htmlFor="activity-field-2"
        >
          إلى
        </label>
        <input
          id="activity-field-2"
          type="date"
          value={draft.endsAt}
          min={draft.startsAt || undefined}
          onChange={(e) => setDraft((p) => ({ ...p, endsAt: e.target.value }))}
          className="input flex-1 min-w-0"
        />
      </div>
      <input
        type="number"
        min={1}
        placeholder="السعة القصوى (اختياري)"
        value={draft.capacity}
        onChange={(e) => setDraft((p) => ({ ...p, capacity: e.target.value }))}
        className="input"
      />
      <div>
        <p className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
          نوع النشاط
        </p>
        <div className="space-y-1.5">
          {NATURES.map((n) => (
            <label
              key={n.value}
              className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer"
              style={{
                background: natureOf(draft) === n.value ? "var(--mint-100)" : "white",
                border:
                  natureOf(draft) === n.value
                    ? "1.5px solid var(--mint-500)"
                    : "1.5px solid var(--mint-100)",
              }}
            >
              <input
                type="radio"
                name="activity-nature"
                checked={natureOf(draft) === n.value}
                onChange={() => setDraft((p) => withNature(p, n.value))}
                className="w-4 h-4"
              />
              <span className="min-w-0">
                <span className="block text-sm font-bold" style={{ color: "var(--text-main)" }}>
                  <IconLabel name={n.icon}>{n.label}</IconLabel>
                </span>
                <span className="block text-xs" style={{ color: "var(--text-muted)" }}>
                  {n.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>
      {draft.isTournament && (
        <TournamentSetupFields
          format={draft.format}
          profile={draft.profile}
          teamSize={draft.teamSize}
          onFormat={(format) => setDraft((p) => ({ ...p, format }))}
          onPreset={(preset) =>
            setDraft((p) => ({ ...p, profile: preset.profile, teamSize: preset.teamSize }))
          }
        />
      )}
      {draft.isVolunteer && (
        <input
          type="text"
          dir="ltr"
          placeholder="رابط مجموعة الواتساب — https://chat.whatsapp.com/..."
          value={draft.whatsappLink}
          onChange={(e) => setDraft((p) => ({ ...p, whatsappLink: e.target.value }))}
          required
          className="input"
        />
      )}
      {error && (
        <div
          className="p-3 rounded-xl text-sm font-semibold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          <IconLabel name="warning">{error}</IconLabel>
        </div>
      )}
      <button type="submit" disabled={saving} className="btn btn-primary text-sm">
        {saving ? "..." : "إضافة"}
      </button>
    </form>
  );
}
