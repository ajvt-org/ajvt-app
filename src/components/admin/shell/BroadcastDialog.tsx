"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import DialogHeader from "@/components/DialogHeader";
import IconLabel from "@/components/IconLabel";
import Notice from "@/components/Notice";
import Sheet from "@/components/Sheet";
import type { ActivityOption } from "./accountTypes";

const EMPTY = { target: "ALL", activityId: "", age: "", title: "", body: "" };

const TARGETS = [
  { value: "ALL", label: "كل الأعضاء النشطين" },
  { value: "ACTIVITY", label: "المسجلون في نشاط معيّن" },
  { value: "AGE", label: "عصر معيّن" },
];

function useAudiences() {
  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [ages, setAges] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<{ activities: ActivityOption[] }>("/api/admin/activities"),
      api.get<{ ages: string[] }>("/api/ages"),
    ])
      .then(([a, g]) => {
        setActivities((a.activities || []).map((x) => ({ id: x.id, title: x.title })));
        setAges(g.ages || []);
      })
      .catch(() => {});
  }, []);

  return { activities, ages };
}

export default function BroadcastDialog({
  onBack,
  onClose,
}: {
  onBack: () => void;
  onClose: () => void;
}) {
  const { activities, ages } = useAudiences();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<number | null>(null);

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSentTo(null);
    setLoading(true);
    try {
      const data = await api.post<{ recipientCount: number }>(
        "/api/admin/notifications/broadcast",
        form,
      );
      setSentTo(data.recipientCount);
      setForm(EMPTY);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet onClose={onClose}>
      <DialogHeader
        title={<IconLabel name="megaphone">إرسال إشعار جماعي</IconLabel>}
        onBack={onBack}
      />

      <form onSubmit={submit} className="p-5 space-y-3">
        <div>
          <label
            className="block text-sm font-bold mb-1.5"
            style={{ color: "var(--text-main)" }}
            htmlFor="broadcast-target"
          >
            المستلمون
          </label>
          <select
            id="broadcast-target"
            value={form.target}
            onChange={(e) => setForm((p) => ({ ...p, target: e.target.value }))}
            className="input"
          >
            {TARGETS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {form.target === "ACTIVITY" && (
          <select
            value={form.activityId}
            onChange={(e) => setForm((p) => ({ ...p, activityId: e.target.value }))}
            required
            className="input"
          >
            <option value="" disabled>
              اختر النشاط...
            </option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        )}

        {form.target === "AGE" && (
          <select
            value={form.age}
            onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))}
            required
            className="input"
          >
            <option value="" disabled>
              اختر العصر...
            </option>
            {ages.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        )}

        <input
          type="text"
          placeholder="عنوان الإشعار"
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          required
          maxLength={60}
          className="input"
        />
        <textarea
          placeholder="نص الإشعار"
          value={form.body}
          onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
          required
          maxLength={300}
          rows={3}
          className="input"
        />

        {error && <Notice tone="error">{error}</Notice>}
        {sentTo !== null && <Notice tone="success">تم الإرسال إلى {sentTo} عضو</Notice>}

        <button type="submit" disabled={loading} className="btn btn-primary text-sm">
          {loading ? "..." : "إرسال"}
        </button>
      </form>
    </Sheet>
  );
}
