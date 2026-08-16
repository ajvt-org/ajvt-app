"use client";

import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import { loginPathWithNext, toThumbUrl } from "@/lib/utils";
import { auditActionLabel } from "@/lib/auditLabels";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import ArrowLabel from "@/components/ArrowLabel";
import PhotoUpload from "@/components/PhotoUpload";
import ProfileSection from "@/components/admin/ProfileSection";
import ActivityDatesEditor from "../ActivityDatesEditor";
import type { ActivityDetail } from "@/components/admin/activityDetailTypes";

const REG_STATUS: Record<string, string> = {
  PENDING: "قيد الانتظار",
  ACTIVE: "مقبول",
  REJECTED: "مرفوض",
};

function day(value: string | null | undefined): string {
  return value ? new Date(value).toISOString().slice(0, 10) : "—";
}

function AdminActivityPageInner({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<ActivityDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    capacity: "",
    whatsappLink: "",
    photo: "",
    isOpen: true,
  });

  function load() {
    return fetch(`/api/admin/activities/${id}/detail`)
      .then((r) => {
        if (r.status === 401) {
          router.push(loginPathWithNext("/admin/login"));
          return null;
        }
        if (r.status === 404) {
          setMissing(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((json: ActivityDetail | null) => {
        if (!json) return;
        setData(json);
        setForm({
          title: json.activity.title,
          description: json.activity.description,
          capacity: json.activity.capacity === null ? "" : String(json.activity.capacity),
          whatsappLink: json.activity.whatsappLink ?? "",
          photo: json.activity.photo ?? "",
          isOpen: json.activity.isOpen,
        });
      })
      .catch(() => {});
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save(ev: React.SubmitEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      await api.patch(`/api/admin/activities/${id}`, {
        title: form.title.trim(),
        description: form.description.trim(),
        capacity: form.capacity === "" ? null : Number(form.capacity),
        whatsappLink: form.whatsappLink.trim() || null,
        photo: form.photo || null,
        isOpen: form.isOpen,
      });
      await load();
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="admin-page text-sm text-center py-16" style={{ color: "var(--mint-500)" }}>
        جاري التحميل...
      </p>
    );
  }

  if (missing || !data) {
    return (
      <div className="admin-page text-center py-16 space-y-3">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          لم نجد هذا النشاط.
        </p>
        <Link
          href="/admin/activities"
          className="text-sm font-bold"
          style={{ color: "var(--mint-600)" }}
        >
          <ArrowLabel direction="back">الأنشطة</ArrowLabel>
        </Link>
      </div>
    );
  }

  const { activity, history } = data;
  const accepted = activity.registrations.filter((r) => r.status === "ACTIVE").length;

  return (
    <div className="admin-page space-y-4">
      <Link
        href="/admin/activities"
        className="text-sm font-bold"
        style={{ color: "var(--mint-600)" }}
      >
        <ArrowLabel direction="back">الأنشطة</ArrowLabel>
      </Link>

      <div className="card p-4 flex items-center gap-3">
        {activity.photo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={toThumbUrl(`/api/files/activity/${activity.photo}`)}
            alt={activity.title}
            className="w-14 h-14 rounded-xl object-cover shrink-0"
          />
        ) : (
          <span
            className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--mint-100)" }}
          >
            <Icon name={activity.isVolunteer ? "handshake" : "trophy"} size={24} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-black text-base truncate" style={{ color: "var(--text-main)" }}>
            {activity.title}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {accepted} مقبول من {activity.registrations.length} طلب
            {activity.capacity !== null ? ` · السعة ${activity.capacity}` : ""}
          </p>
        </div>
        {activity.isTournament && (
          <Link
            href={`/admin/tournament/${activity.id}?title=${encodeURIComponent(activity.title)}`}
            className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            <IconLabel name="trophy">إدارة البطولة</IconLabel>
          </Link>
        )}
      </div>

      <ProfileSection icon="pencil" title="التعديل">
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
                dir="ltr"
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
          {saved && !error && (
            <p className="text-xs font-semibold" style={{ color: "var(--mint-700)" }}>
              <IconLabel name="check">تم الحفظ</IconLabel>
            </p>
          )}

          <button type="submit" disabled={saving} className="btn btn-sm btn-ghost">
            <IconLabel name="save">{saving ? "..." : "حفظ"}</IconLabel>
          </button>
        </form>
      </ProfileSection>

      <ProfileSection icon="calendar" title="التواريخ">
        <ActivityDatesEditor activity={activity} onSaved={load} />
      </ProfileSection>

      <ProfileSection icon="users" title={`المسجلون (${activity.registrations.length})`}>
        {activity.registrations.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            لا يوجد مسجلون بعد
          </p>
        ) : (
          <ul className="space-y-1.5">
            {activity.registrations.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                {/* Straight to the member's file, which is the question that
                    follows "who registered" more often than not. */}
                <Link
                  href={`/admin/members/${r.member.id}`}
                  className="min-w-0 truncate font-bold"
                  style={{ color: "var(--mint-700)" }}
                >
                  {r.member.fullName}
                </Link>
                <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                  {r.member.age} · {REG_STATUS[r.status] ?? r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ProfileSection>

      {activity.teams.length > 0 && (
        <ProfileSection icon="shield" title={`الفرق (${activity.teams.length})`}>
          <ul className="space-y-1.5">
            {activity.teams.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{t.name}</span>
                <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                  {t._count.members} لاعب
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
            {activity._count.matches} مباراة · {activity._count.groups} مجموعة
          </p>
        </ProfileSection>
      )}

      <ProfileSection icon="list" title={`سجل التغييرات (${history.length})`}>
        {history.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            لا توجد تغييرات مسجلة
          </p>
        ) : (
          <ul className="space-y-1.5">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{auditActionLabel(h.action)}</span>
                <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                  {h.adminUsername} · <span dir="ltr">{day(h.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </ProfileSection>
    </div>
  );
}

export default function AdminActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={null}>
      <AdminActivityPageInner id={id} />
    </Suspense>
  );
}
