"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PhotoUpload from "@/components/PhotoUpload";
import BarChart from "@/components/admin/BarChart";

interface Registration {
  id: string;
  member: { id: string; fullName: string; phone: string; age: string };
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
  createdAt: string;
  registrations: Registration[];
}

interface MemberOption {
  id: string;
  fullName: string;
  phone: string;
  status: "PENDING" | "ACTIVE" | "REJECTED";
}

const STATUS_LABEL: Record<string, string> = { PENDING: "قيد الانتظار", ACTIVE: "مقبول", REJECTED: "غير مقبول" };

export default function AdminActivitiesPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [newActivity, setNewActivity] = useState({ title: "", description: "", period: "", capacity: "", photo: "", isTournament: false });
  const [activityError, setActivityError] = useState("");
  const [addMemberFor, setAddMemberFor] = useState<Record<string, string>>({});
  const [memberSearch, setMemberSearch] = useState<Record<string, string>>({});

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [activitiesRes, membersRes] = await Promise.all([
        fetch("/api/admin/activities"),
        fetch("/api/admin/members"),
      ]);
      if (activitiesRes.status === 401 || membersRes.status === 401) { router.push("/admin/login"); return; }
      const activitiesData = await activitiesRes.json();
      const membersData = await membersRes.json();
      setActivities(activitiesData.activities || []);
      setMembers((membersData.members || []).map((m: { id: string; fullName: string; phone: string; status: string }) => ({
        id: m.id, fullName: m.fullName, phone: m.phone, status: m.status,
      })));
    } catch {
      router.push("/admin/login");
    } finally {
      setLoading(false);
    }
  }

  async function createActivity(e: React.FormEvent) {
    e.preventDefault();
    setActivityError("");
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newActivity),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setNewActivity({ title: "", description: "", period: "", capacity: "", photo: "", isTournament: false });
      await loadAll();
    } catch (e) {
      setActivityError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setActionLoading(false);
    }
  }

  async function updateActivityPhoto(id: string, photo: string) {
    const res = await fetch(`/api/admin/activities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "فشلت العملية");
    await loadAll();
  }

  async function toggleActivityTournament(activity: Activity) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/activities/${activity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTournament: !activity.isTournament }),
      });
      if (!res.ok) throw new Error("فشلت العملية");
      await loadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleActivityOpen(activity: Activity) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/activities/${activity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: !activity.isOpen }),
      });
      if (!res.ok) throw new Error("فشلت العملية");
      await loadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteActivity(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا النشاط؟ سيتم إلغاء تسجيل جميع الأعضاء فيه.")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/activities/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشلت العملية");
      await loadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setActionLoading(false);
    }
  }

  async function registerMember(activityId: string) {
    const memberId = addMemberFor[activityId];
    if (!memberId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/activities/${activityId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setAddMemberFor((p) => ({ ...p, [activityId]: "" }));
      await loadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setActionLoading(false);
    }
  }

  async function unregisterMember(activityId: string, memberId: string) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/activities/${activityId}/register`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) throw new Error("فشلت العملية");
      await loadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
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
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
      {activities.length === 0 ? (
        <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
          لا توجد أنشطة بعد — أضف أول نشاط أدناه
        </p>
      ) : (
        <>
        <div className="card p-4">
          <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>عدد المسجلين حسب النشاط</p>
          <BarChart data={activities.map((a) => ({ label: a.title.slice(0, 6), value: a.registrations.length }))} />
        </div>
        {activities.map((a) => {
          const registeredIds = new Set(a.registrations.map((r) => r.member.id));
          const candidates = members.filter((m) => {
            if (registeredIds.has(m.id)) return false;
            const q = (memberSearch[a.id] || "").trim();
            return !q || m.fullName.includes(q) || m.phone.includes(q);
          });
          return (
            <div key={a.id} className="card p-4">
              <div className="mb-3">
                <PhotoUpload
                  photo={a.photo}
                  imageUrlPrefix="/api/files/activity"
                  variant="cover"
                  label="صورة النشاط"
                  placeholderIcon="🖼️"
                  onUpload={(filename) => updateActivityPhoto(a.id, filename)}
                />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>{a.title}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{a.description}</p>
                  <div className="flex items-center gap-3 text-xs mt-2 flex-wrap" style={{ color: "var(--text-muted)" }}>
                    {a.period && <span>📅 {a.period}</span>}
                    <span>👥 {a.registrations.length}{a.capacity !== null ? `/${a.capacity}` : ""}</span>
                    <span className={`badge ${a.isOpen ? "badge-active" : "badge-rejected"}`}>
                      {a.isOpen ? "مفتوح" : "مغلق"}
                    </span>
                    {a.isTournament && <span className="badge badge-pending">⚽ بطولة</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {a.isTournament ? (
                  <button
                    onClick={() => router.push(`/admin/tournament/${a.id}?title=${encodeURIComponent(a.title)}`)}
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
                    style={{ background: "white", color: "var(--mint-700)", border: "1px solid var(--mint-200)" }}
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
                  {a.isOpen ? "إغلاق التسجيل" : "فتح التسجيل"}
                </button>
                <button
                  onClick={() => setExpandedActivity((v) => (v === a.id ? null : a.id))}
                  className="text-xs px-3 py-1.5 rounded-lg font-bold"
                  style={{ background: "white", color: "var(--mint-700)", border: "1px solid var(--mint-200)" }}
                >
                  {expandedActivity === a.id ? "إخفاء المسجلين" : "إدارة المسجلين"}
                </button>
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
                <div className="mt-3 pt-3 space-y-3" style={{ borderTop: "1px solid var(--mint-100)" }}>
                  <div className="space-y-1.5">
                    {a.registrations.length === 0 ? (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>لا يوجد مسجلون بعد</p>
                    ) : (
                      a.registrations.map((r) => (
                        <div key={r.id} className="flex items-center justify-between text-xs">
                          <span style={{ color: "var(--text-main)" }}>{r.member.fullName}</span>
                          <div className="flex items-center gap-2">
                            <span style={{ color: "var(--text-muted)" }} dir="ltr">{r.member.phone}</span>
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
                    <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>➕ تسجيل عضو يدوياً</p>
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
                        onChange={(e) => setAddMemberFor((p) => ({ ...p, [a.id]: e.target.value }))}
                        className="input flex-1 text-sm"
                      >
                        <option value="">اختر عضواً...</option>
                        {candidates.map((m) => (
                          <option key={m.id} value={m.id}>{m.fullName} — {STATUS_LABEL[m.status]}</option>
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
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>➕ إضافة نشاط جديد</p>
        <PhotoUpload
          photo={newActivity.photo || null}
          imageUrlPrefix="/api/files/activity"
          variant="cover"
          label="صورة النشاط"
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
        <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-main)" }}>
          <input
            type="checkbox"
            checked={newActivity.isTournament}
            onChange={(e) => setNewActivity((p) => ({ ...p, isTournament: e.target.checked }))}
          />
          ⚽ هذا النشاط بطولة (فرق، مباريات، ترتيب، هدافون)
        </label>
        {activityError && (
          <div className="p-3 rounded-xl text-sm font-semibold" style={{ background: "#fee2e2", color: "#991b1b" }}>
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
