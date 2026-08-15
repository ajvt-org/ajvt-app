"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PhotoUpload from "@/components/PhotoUpload";
import BarChart from "@/components/admin/BarChart";
import { loginPathWithNext } from "@/lib/utils";
import { api, errorMessage } from "@/lib/api";
import Icon from "@/components/Icon";
import ArrowLabel from "@/components/ArrowLabel";
import IconLabel from "@/components/IconLabel";
import NumericRanges from "@/components/NumericRanges";

interface Registration {
  id: string;
  status: "PENDING" | "ACTIVE" | "REJECTED";
  paymentProof: string | null;
  rejectionReason: string | null;
  member: { id: string; fullName: string; phone: string | null; age: string };
}

interface Activity {
  id: string;
  title: string;
  description: string;
  period: string | null;
  photo: string | null;
  capacity: number | null;
  isOpen: boolean;
  isTournament: boolean;
  isVolunteer: boolean;
  whatsappLink: string | null;
  order: number;
  createdAt: string;
  registrations: Registration[];
}

interface MemberOption {
  id: string;
  fullName: string;
  phone: string | null;
  status: "PENDING" | "ACTIVE" | "REJECTED";
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "قيد الانتظار",
  ACTIVE: "مقبول",
  REJECTED: "غير مقبول",
};

export default function AdminActivitiesPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [newActivity, setNewActivity] = useState({
    title: "",
    description: "",
    period: "",
    capacity: "",
    photo: "",
    isTournament: false,
    isVolunteer: false,
    whatsappLink: "",
  });
  const [activityError, setActivityError] = useState("");
  const [addMemberFor, setAddMemberFor] = useState<Record<string, string>>({});
  const [memberSearch, setMemberSearch] = useState<Record<string, string>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [linkDraft, setLinkDraft] = useState("");
  const [reorderLoading, setReorderLoading] = useState(false);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    try {
      const [activitiesRes, membersRes] = await Promise.all([
        fetch("/api/admin/activities"),
        fetch("/api/admin/members"),
      ]);
      if (activitiesRes.status === 401 || membersRes.status === 401) {
        router.push(loginPathWithNext("/admin/login"));
        return;
      }
      const activitiesData = await activitiesRes.json();
      const membersData = await membersRes.json();
      setActivities(activitiesData.activities || []);
      setMembers(
        (membersData.members || []).map(
          (m: { id: string; fullName: string; phone: string | null; status: string }) => ({
            id: m.id,
            fullName: m.fullName,
            phone: m.phone,
            status: m.status,
          }),
        ),
      );
    } catch {
      router.push(loginPathWithNext("/admin/login"));
    } finally {
      setLoading(false);
    }
  }

  async function createActivity(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setActivityError("");
    setActionLoading(true);
    try {
      const data = await api.post<{ activity: Activity }>("/api/admin/activities", newActivity);
      const created = data.activity;
      setNewActivity({
        title: "",
        description: "",
        period: "",
        capacity: "",
        photo: "",
        isTournament: false,
        isVolunteer: false,
        whatsappLink: "",
      });
      if (created?.isTournament) {
        router.push(`/admin/tournament/${created.id}?title=${encodeURIComponent(created.title)}`);
        return;
      }
      await loadAll();
    } catch (e) {
      setActivityError(errorMessage(e));
    } finally {
      setActionLoading(false);
    }
  }

  async function updateActivityPhoto(id: string, photo: string) {
    await api.patch(`/api/admin/activities/${id}`, { photo });
    await loadAll();
  }

  async function toggleActivityTournament(activity: Activity) {
    setActionLoading(true);
    try {
      await api.patch(`/api/admin/activities/${activity.id}`, {
        isTournament: !activity.isTournament,
      });
      await loadAll();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleActivityOpen(activity: Activity) {
    setActionLoading(true);
    try {
      await api.patch(`/api/admin/activities/${activity.id}`, { isOpen: !activity.isOpen });
      await loadAll();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setActionLoading(false);
    }
  }

  async function moveActivity(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activities.length) return;
    const a = activities[index];
    const b = activities[targetIndex];
    setReorderLoading(true);
    try {
      await Promise.all([
        fetch(`/api/admin/activities/${a.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: b.order }),
        }),
        fetch(`/api/admin/activities/${b.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: a.order }),
        }),
      ]);
      await loadAll();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setReorderLoading(false);
    }
  }

  async function saveWhatsappLink(id: string) {
    setActionLoading(true);
    try {
      await api.patch(`/api/admin/activities/${id}`, {
        whatsappLink: linkDraft.trim(),
      });
      setEditingLinkId(null);
      await loadAll();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteActivity(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا النشاط؟ سيتم إلغاء تسجيل جميع الأعضاء فيه.")) return;
    setActionLoading(true);
    try {
      await api.del(`/api/admin/activities/${id}`);
      await loadAll();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setActionLoading(false);
    }
  }

  async function registerMember(activityId: string) {
    const memberId = addMemberFor[activityId];
    if (!memberId) return;
    setActionLoading(true);
    try {
      await api.post(`/api/admin/activities/${activityId}/register`, { memberId });
      setAddMemberFor((p) => ({ ...p, [activityId]: "" }));
      await loadAll();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setActionLoading(false);
    }
  }

  async function reviewRegistration(
    activityId: string,
    registrationId: string,
    status: "ACTIVE" | "REJECTED",
    reason?: string,
  ) {
    setActionLoading(true);
    try {
      await api.patch(`/api/admin/activities/${activityId}/register`, {
        registrationId,
        status,
        reason,
      });
      setRejectingId(null);
      setRejectReason("");
      await loadAll();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setActionLoading(false);
    }
  }

  async function unregisterMember(activityId: string, memberId: string) {
    setActionLoading(true);
    try {
      await api.del(`/api/admin/activities/${activityId}/register`, { memberId });
      await loadAll();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-16" style={{ color: "var(--mint-500)" }}>
        <div className="text-4xl animate-pulse mb-3">⏳</div>
        <p className="text-sm font-semibold">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="admin-page space-y-3">
      {activities.length === 0 ? (
        <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
          لا توجد أنشطة بعد — أضف أول نشاط أدناه
        </p>
      ) : (
        <>
          <div className="card p-4">
            <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>
              عدد المسجلين حسب النشاط
            </p>
            <BarChart
              data={activities.map((a) => ({
                label: a.title.slice(0, 6),
                value: a.registrations.filter((r) => r.status !== "REJECTED").length,
              }))}
            />
          </div>
          {activities.map((a, index) => {
            const confirmedCount = a.registrations.filter((r) => r.status !== "REJECTED").length;
            const pending = a.registrations.filter((r) => r.status === "PENDING");
            const active = a.registrations.filter((r) => r.status === "ACTIVE");
            const registeredIds = new Set(
              a.registrations.filter((r) => r.status !== "REJECTED").map((r) => r.member.id),
            );
            const candidates = members.filter((m) => {
              if (registeredIds.has(m.id)) return false;
              const q = (memberSearch[a.id] || "").trim();
              return !q || m.fullName.includes(q) || (m.phone || "").includes(q);
            });
            return (
              <div key={a.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                    ترتيب الظهور في الصفحة الرئيسية
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveActivity(index, "up")}
                      disabled={reorderLoading || index === 0}
                      aria-label="نقل لأعلى"
                      className="w-7 h-7 rounded-lg disabled:opacity-30 flex items-center justify-center"
                      style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                    >
                      <Icon name="arrowUp" size={15} />
                    </button>
                    <button
                      onClick={() => moveActivity(index, "down")}
                      disabled={reorderLoading || index === activities.length - 1}
                      aria-label="نقل لأسفل"
                      className="w-7 h-7 rounded-lg disabled:opacity-30 flex items-center justify-center"
                      style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                    >
                      <Icon name="arrowDown" size={15} />
                    </button>
                  </div>
                </div>
                <div className="mb-3">
                  <PhotoUpload
                    photo={a.photo}
                    imageUrlPrefix="/api/files/activity"
                    variant="avatar"
                    label={a.isTournament ? "شعار البطولة" : "صورة النشاط"}
                    placeholderIcon="🖼️"
                    onUpload={(filename) => updateActivityPhoto(a.id, filename)}
                  />
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                      {a.title}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      {a.description}
                    </p>
                    <div
                      className="flex items-center gap-3 text-xs mt-2 flex-wrap"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {a.period && (
                        <span>
                          📅 <NumericRanges>{a.period}</NumericRanges>
                        </span>
                      )}
                      {!a.isVolunteer && (
                        <span>
                          👥 {confirmedCount}
                          {a.capacity !== null ? `/${a.capacity}` : ""}
                        </span>
                      )}
                      {a.isVolunteer && confirmedCount > 0 && (
                        <span className="badge badge-active">💚 {confirmedCount} متطوعين</span>
                      )}
                      {!a.isVolunteer && pending.length > 0 && (
                        <span className="badge badge-pending">
                          ⏳ {pending.length} بانتظار المراجعة
                        </span>
                      )}
                      <span className={`badge ${a.isOpen ? "badge-active" : "badge-rejected"}`}>
                        {a.isOpen ? "ظاهر" : "مخفي"}
                      </span>
                      {a.isTournament && <span className="badge badge-pending">⚽ بطولة</span>}
                      {a.isVolunteer && <span className="badge badge-pending">🤝 حملة تطوعية</span>}
                    </div>
                    {a.isVolunteer && (
                      <div className="mt-2">
                        {editingLinkId === a.id ? (
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              dir="ltr"
                              value={linkDraft}
                              onChange={(e) => setLinkDraft(e.target.value)}
                              placeholder="https://chat.whatsapp.com/..."
                              className="input text-xs flex-1"
                            />
                            <button
                              onClick={() => saveWhatsappLink(a.id)}
                              disabled={actionLoading}
                              className="text-xs px-2.5 py-1 rounded-lg font-bold shrink-0"
                              style={{ background: "var(--mint-600)", color: "white" }}
                            >
                              حفظ
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingLinkId(a.id);
                              setLinkDraft(a.whatsappLink || "");
                            }}
                            className="text-xs font-bold"
                            style={{ color: "var(--mint-600)" }}
                          >
                            <Icon name="chat" size={14} className="icon-inline" />{" "}
                            {a.whatsappLink || "إضافة رابط الواتساب"}{" "}
                            <Icon name="pencil" size={12} className="icon-inline" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {a.isVolunteer ? null : a.isTournament ? (
                    <button
                      onClick={() =>
                        router.push(
                          `/admin/tournament/${a.id}?title=${encodeURIComponent(a.title)}`,
                        )
                      }
                      className="text-xs px-3 py-1.5 rounded-lg font-bold"
                      style={{ background: "var(--mint-700)", color: "white" }}
                    >
                      ⚽ إدارة البطولة
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleActivityTournament(a)}
                      disabled={actionLoading}
                      className="text-xs px-3 py-1.5 rounded-lg font-bold"
                      style={{
                        background: "white",
                        color: "var(--mint-700)",
                        border: "1px solid var(--mint-200)",
                      }}
                    >
                      ⚽ تحويل إلى بطولة
                    </button>
                  )}
                  <button
                    onClick={() => toggleActivityOpen(a)}
                    disabled={actionLoading}
                    className="text-xs px-3 py-1.5 rounded-lg font-bold"
                    style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                  >
                    {a.isVolunteer
                      ? a.isOpen
                        ? "إخفاء من الصفحة الرئيسية"
                        : "إظهار في الصفحة الرئيسية"
                      : a.isOpen
                        ? "إغلاق التسجيل"
                        : "فتح التسجيل"}
                  </button>
                  {!a.isVolunteer && (
                    <button
                      onClick={() => setExpandedActivity((v) => (v === a.id ? null : a.id))}
                      className="text-xs px-3 py-1.5 rounded-lg font-bold"
                      style={{
                        background: "white",
                        color: "var(--mint-700)",
                        border: "1px solid var(--mint-200)",
                      }}
                    >
                      {expandedActivity === a.id ? "إخفاء المسجلين" : "إدارة المسجلين"}
                    </button>
                  )}
                  <button
                    onClick={() => deleteActivity(a.id)}
                    disabled={actionLoading}
                    className="text-xs px-3 py-1.5 rounded-lg font-bold mr-auto"
                    style={{ background: "#fee2e2", color: "#991b1b" }}
                  >
                    🗑 حذف
                  </button>
                </div>

                {expandedActivity === a.id && (
                  <div
                    className="mt-3 pt-3 space-y-3"
                    style={{ borderTop: "1px solid var(--mint-100)" }}
                  >
                    {pending.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
                          ⏳ طلبات قيد المراجعة
                        </p>
                        {pending.map((r) => (
                          <div
                            key={r.id}
                            className="rounded-xl p-2.5 space-y-1.5"
                            style={{ background: "var(--mint-50)" }}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold" style={{ color: "var(--text-main)" }}>
                                {r.member.fullName}
                              </span>
                              <span style={{ color: "var(--text-muted)" }} dir="ltr">
                                {r.member.phone || "غير معروف"}
                              </span>
                            </div>
                            {r.paymentProof && (
                              <a
                                href={`/api/files/${r.paymentProof}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold inline-block"
                                style={{ color: "var(--mint-700)" }}
                              >
                                <ArrowLabel>🧾 عرض إثبات الدفع</ArrowLabel>
                              </a>
                            )}
                            {rejectingId === r.id ? (
                              <div className="space-y-1.5">
                                <textarea
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  placeholder="سبب الرفض (اختياري)..."
                                  maxLength={300}
                                  rows={2}
                                  className="input text-xs"
                                />
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() =>
                                      reviewRegistration(a.id, r.id, "REJECTED", rejectReason)
                                    }
                                    disabled={actionLoading}
                                    className="text-xs px-2.5 py-1 rounded-lg font-bold"
                                    style={{ background: "#991b1b", color: "white" }}
                                  >
                                    تأكيد الرفض
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRejectingId(null);
                                      setRejectReason("");
                                    }}
                                    className="text-xs px-2.5 py-1 rounded-lg font-bold"
                                    style={{
                                      background: "white",
                                      color: "var(--text-muted)",
                                      border: "1px solid var(--mint-200)",
                                    }}
                                  >
                                    إلغاء
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => reviewRegistration(a.id, r.id, "ACTIVE")}
                                  disabled={actionLoading}
                                  className="text-xs px-2.5 py-1 rounded-lg font-bold"
                                  style={{ background: "var(--mint-600)", color: "white" }}
                                >
                                  ✓ قبول
                                </button>
                                <button
                                  onClick={() => setRejectingId(r.id)}
                                  disabled={actionLoading}
                                  className="text-xs px-2.5 py-1 rounded-lg font-bold"
                                  style={{ background: "#fee2e2", color: "#991b1b" }}
                                >
                                  <IconLabel name="close">رفض</IconLabel>
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
                        ✓ مسجَّلون مؤكَّدون
                      </p>
                      {active.length === 0 ? (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          لا يوجد مسجلون مؤكَّدون بعد
                        </p>
                      ) : (
                        active.map((r) => (
                          <div key={r.id} className="flex items-center justify-between text-xs">
                            <span style={{ color: "var(--text-main)" }}>{r.member.fullName}</span>
                            <div className="flex items-center gap-2">
                              <span style={{ color: "var(--text-muted)" }} dir="ltr">
                                {r.member.phone || "غير معروف"}
                              </span>
                              <button
                                onClick={() => unregisterMember(a.id, r.member.id)}
                                className="font-bold px-2 py-0.5 rounded"
                                style={{ background: "#fee2e2", color: "#991b1b" }}
                              >
                                إزالة
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
                        <IconLabel name="plus">تسجيل عضو يدوياً</IconLabel>
                      </p>
                      <input
                        type="text"
                        placeholder="بحث بالاسم أو الهاتف..."
                        value={memberSearch[a.id] || ""}
                        onChange={(e) => setMemberSearch((p) => ({ ...p, [a.id]: e.target.value }))}
                        className="input text-sm"
                      />
                      <div className="flex gap-2">
                        <select
                          value={addMemberFor[a.id] || ""}
                          onChange={(e) =>
                            setAddMemberFor((p) => ({ ...p, [a.id]: e.target.value }))
                          }
                          className="input flex-1 text-sm"
                        >
                          <option value="">اختر عضواً...</option>
                          {candidates.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.fullName} — {STATUS_LABEL[m.status]}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => registerMember(a.id)}
                          disabled={!addMemberFor[a.id] || actionLoading}
                          className="btn btn-primary text-xs px-3"
                          style={{ width: "auto" }}
                        >
                          تسجيل
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      <form onSubmit={createActivity} className="card p-4 space-y-3">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="plus">إضافة نشاط جديد</IconLabel>
        </p>
        <PhotoUpload
          photo={newActivity.photo || null}
          imageUrlPrefix="/api/files/activity"
          variant="avatar"
          label={newActivity.isTournament ? "شعار البطولة" : "صورة النشاط"}
          placeholderIcon="🖼️"
          onUpload={(filename) => setNewActivity((p) => ({ ...p, photo: filename }))}
        />
        <input
          type="text"
          placeholder="عنوان النشاط"
          value={newActivity.title}
          onChange={(e) => setNewActivity((p) => ({ ...p, title: e.target.value }))}
          required
          maxLength={60}
          className="input"
        />
        <textarea
          placeholder="الوصف"
          value={newActivity.description}
          onChange={(e) => setNewActivity((p) => ({ ...p, description: e.target.value }))}
          required
          maxLength={1000}
          rows={3}
          className="input"
        />
        <input
          type="text"
          placeholder="الفترة (اختياري) — مثال: 22-23 أغسطس 2026"
          value={newActivity.period}
          onChange={(e) => setNewActivity((p) => ({ ...p, period: e.target.value }))}
          className="input"
        />
        <input
          type="number"
          min={1}
          placeholder="السعة القصوى (اختياري)"
          value={newActivity.capacity}
          onChange={(e) => setNewActivity((p) => ({ ...p, capacity: e.target.value }))}
          className="input"
        />
        <label
          className="flex items-center gap-2 text-sm font-semibold"
          style={{ color: "var(--text-main)" }}
        >
          <input
            type="checkbox"
            checked={newActivity.isTournament}
            onChange={(e) =>
              setNewActivity((p) => ({
                ...p,
                isTournament: e.target.checked,
                isVolunteer: e.target.checked ? false : p.isVolunteer,
              }))
            }
          />
          ⚽ هذا النشاط بطولة (فرق، مباريات، ترتيب، هدافون)
        </label>
        <label
          className="flex items-center gap-2 text-sm font-semibold"
          style={{ color: "var(--text-main)" }}
        >
          <input
            type="checkbox"
            checked={newActivity.isVolunteer}
            onChange={(e) =>
              setNewActivity((p) => ({
                ...p,
                isVolunteer: e.target.checked,
                isTournament: e.target.checked ? false : p.isTournament,
              }))
            }
          />
          🤝 هذا النشاط حملة تطوعية (بدون تسجيل داخل التطبيق — رابط واتساب مباشر)
        </label>
        {newActivity.isVolunteer && (
          <input
            type="text"
            dir="ltr"
            placeholder="رابط مجموعة الواتساب — https://chat.whatsapp.com/..."
            value={newActivity.whatsappLink}
            onChange={(e) => setNewActivity((p) => ({ ...p, whatsappLink: e.target.value }))}
            required
            className="input"
          />
        )}
        {activityError && (
          <div
            className="p-3 rounded-xl text-sm font-semibold"
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            ⚠️ {activityError}
          </div>
        )}
        <button type="submit" disabled={actionLoading} className="btn btn-primary text-sm">
          {actionLoading ? "..." : "إضافة"}
        </button>
      </form>
    </div>
  );
}
