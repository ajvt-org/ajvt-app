"use client";

import { useState } from "react";
import PhotoUpload from "@/components/PhotoUpload";
import IconLabel from "@/components/IconLabel";
import { errorMessage } from "@/lib/api";
import { emptyNewActivity, type NewActivityDraft } from "./activityTypes";

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
      <label
        className="flex items-center gap-2 text-sm font-semibold"
        style={{ color: "var(--text-main)" }}
      >
        <input
          type="checkbox"
          checked={draft.isTournament}
          onChange={(e) =>
            setDraft((p) => ({
              ...p,
              isTournament: e.target.checked,
              isVolunteer: e.target.checked ? false : p.isVolunteer,
            }))
          }
        />
        <IconLabel name="ball">هذا النشاط بطولة (فرق، مباريات، ترتيب، هدافون)</IconLabel>
      </label>
      {draft.isTournament && (
        <div>
          <label
            className="block text-sm font-bold mb-1.5"
            style={{ color: "var(--text-main)" }}
            htmlFor="activity-format"
          >
            نظام البطولة
          </label>
          <select
            id="activity-format"
            value={draft.format}
            onChange={(e) => setDraft((p) => ({ ...p, format: e.target.value }))}
            className="input"
          >
            <option value="KNOCKOUT">خروج المغلوب مباشرة</option>
            <option value="GROUPS_THEN_KNOCKOUT">مجموعات ثم خروج المغلوب</option>
          </select>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            لا يمكن تغييره بعد إنشاء المباريات
          </p>
        </div>
      )}
      <label
        className="flex items-center gap-2 text-sm font-semibold"
        style={{ color: "var(--text-main)" }}
      >
        <input
          type="checkbox"
          checked={draft.isVolunteer}
          onChange={(e) =>
            setDraft((p) => ({
              ...p,
              isVolunteer: e.target.checked,
              isTournament: e.target.checked ? false : p.isTournament,
            }))
          }
        />
        🤝 هذا النشاط حملة تطوعية (بدون تسجيل داخل التطبيق — رابط واتساب مباشر)
      </label>
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
          ⚠️ {error}
        </div>
      )}
      <button type="submit" disabled={saving} className="btn btn-primary text-sm">
        {saving ? "..." : "إضافة"}
      </button>
    </form>
  );
}
