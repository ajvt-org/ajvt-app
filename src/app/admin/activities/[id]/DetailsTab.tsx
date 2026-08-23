"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PhotoUpload from "@/components/PhotoUpload";
import ActivityDatesEditor from "../ActivityDatesEditor";
import type { ActivityDetail } from "@/components/admin/activityDetailTypes";

export default function DetailsTab({
  activity,
  onSaved,
}: {
  activity: ActivityDetail["activity"];
  onSaved: () => Promise<void> | void;
}) {
  const showToast = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: activity.title,
    description: activity.description,
    capacity: activity.capacity === null ? "" : String(activity.capacity),
    whatsappLink: activity.whatsappLink ?? "",
    photo: activity.photo ?? "",
    isOpen: activity.isOpen,
  });

  async function save(ev: React.SubmitEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.patch(`/api/admin/activities/${activity.id}`, {
        title: form.title.trim(),
        description: form.description.trim(),
        capacity: form.capacity === "" ? null : Number(form.capacity),
        whatsappLink: form.whatsappLink.trim() || null,
        photo: form.photo || null,
        isOpen: form.isOpen,
      });
      await onSaved();
      showToast("تم حفظ التفاصيل");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <p className="text-sm font-bold mb-3" style={{ color: "var(--text-main)" }}>
          <IconLabel name="pencil">تفاصيل النشاط</IconLabel>
        </p>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label htmlFor="activity-title" className="block text-sm font-bold mb-1.5">
              العنوان
            </label>
            <input
              id="activity-title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              maxLength={100}
              required
              className="input"
            />
          </div>

          <div>
            <label htmlFor="activity-description" className="block text-sm font-bold mb-1.5">
              الوصف
            </label>
            <textarea
              id="activity-description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="input"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-0">
              <label htmlFor="activity-capacity" className="block text-sm font-bold mb-1.5">
                السعة
              </label>
              <input
                id="activity-capacity"
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
                placeholder="بدون حد"
                className="input"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label htmlFor="activity-whatsapp" className="block text-sm font-bold mb-1.5">
                رابط الواتساب
              </label>
              <input
                id="activity-whatsapp"
                value={form.whatsappLink}
                onChange={(e) => setForm((p) => ({ ...p, whatsappLink: e.target.value }))}
                dir="ltr"
                className="input"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={form.isOpen}
              onChange={(e) => setForm((p) => ({ ...p, isOpen: e.target.checked }))}
              className="w-4 h-4"
            />
            التسجيل مفتوح
          </label>

          <div>
            <p className="block text-sm font-bold mb-1.5">الصورة</p>
            <PhotoUpload
              photo={form.photo || null}
              imageUrlPrefix="/api/files/activity"
              variant="cover"
              label="صورة النشاط"
              onUpload={(filename) => setForm((p) => ({ ...p, photo: filename }))}
            />
          </div>

          {error && (
            <p className="text-xs font-semibold" style={{ color: "#dc2626" }}>
              <Icon name="warning" size={13} className="icon-inline" /> {error}
            </p>
          )}

          <button type="submit" disabled={saving} className="btn btn-sm btn-primary">
            <IconLabel name="save">{saving ? "..." : "حفظ التفاصيل"}</IconLabel>
          </button>
        </form>
      </div>

      <div className="card p-4">
        <p className="text-sm font-bold mb-3" style={{ color: "var(--text-main)" }}>
          <IconLabel name="calendar">التواريخ</IconLabel>
        </p>
        <ActivityDatesEditor activity={activity} onSaved={onSaved} />
      </div>
    </div>
  );
}
