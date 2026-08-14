"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useInactivityLogout } from "@/lib/useInactivityLogout";
import { loginPathWithNext } from "@/lib/utils";
import { api, errorMessage } from "@/lib/api";

// Auto-logout after this long with no click/keypress/scroll/touch — an
// admin panel with payment proofs and member data shouldn't stay open
// indefinitely on a shared or unattended device.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

interface AdminAccount {
  id: string;
  username: string;
  role: string;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
}

interface ActivityOption {
  id: string;
  title: string;
}

const ROLE_LABEL: Record<string, string> = {
  SUPER: "كامل الصلاحيات",
  MEMBERS: "الأعضاء فقط",
  ACTIVITIES: "الأنشطة فقط",
  QUIZ: "المسابقة الثقافية فقط",
};

interface AuditLogEntry {
  id: string;
  adminUsername: string;
  action: string;
  targetLabel: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  APPROVE_MEMBER: "قبول طلب",
  REJECT_MEMBER: "رفض طلب",
  DELETE_MEMBER: "حذف طلب",
  CREATE_MEMBER_MANUAL: "إضافة عضو يدوياً",
  RESET_MEMBER_PASSWORD: "إعادة تعيين كلمة مرور عضو",
  CHANGE_OWN_PASSWORD: "تغيير كلمة مرور شخصية",
  CREATE_ADMIN: "إنشاء حساب مشرف",
  DELETE_ADMIN: "حذف حساب مشرف",
  CREATE_ACTIVITY: "إنشاء نشاط",
  UPDATE_ACTIVITY: "تعديل نشاط",
  DELETE_ACTIVITY: "حذف نشاط",
  CREATE_TEAM: "إنشاء فريق",
  UPDATE_TEAM: "تعديل فريق",
  DELETE_TEAM: "حذف فريق",
  CREATE_MATCH: "إضافة مباراة",
  DELETE_MATCH: "حذف مباراة",
  ENTER_MATCH_RESULT: "إدخال نتيجة مباراة",
  CREATE_GROUP: "إنشاء مجموعة",
  UPDATE_GROUP: "تعديل مجموعة",
  DELETE_GROUP: "حذف مجموعة",
  SEND_BROADCAST: "إرسال إشعار جماعي",
  APPROVE_TEAM_JOIN: "قبول طلب انضمام لفريق",
  DELETE_DONATION: "حذف تبرع نهائياً",
  ATTACH_MEMBER_ACCOUNT: "إنشاء حساب لعضو",
  CREATE_EXPENSE: "إضافة مصروف",
  UPDATE_EXPENSE: "تعديل مصروف",
  DELETE_EXPENSE: "حذف مصروف",
  UPDATE_MEMBER: "تعديل بيانات عضو",
  CREATE_AGE_GROUP: "إضافة عصر",
  UPDATE_AGE_GROUP: "تعديل اسم عصر",
  DELETE_AGE_GROUP: "حذف عصر",
  CREATE_QUIZ_QUESTION: "إضافة سؤال ",
  UPDATE_QUIZ_QUESTION: "تعديل سؤال ",
  DELETE_QUIZ_QUESTION: "حذف سؤال ",
  SEND_QUIZ_QUESTION: "إرسال سؤال ",
  UPDATE_QUIZ_SETTINGS: "تعديل إعدادات المسابقة الثقافية ",
};

const NAV_TABS = [
  { href: "/admin/dashboard", label: "👥 الأعضاء" },
  { href: "/admin/activities", label: "🏆 الأنشطة" },
  { href: "/admin/payments", label: "🧾 المدفوعات" },
  { href: "/admin/expenses", label: "💸 المصاريف" },
  { href: "/admin/quiz", label: "🧠 المسابقة الثقافية " },
  { href: "/admin/stats", label: "📊 الإحصائيات" },
  { href: "/admin/settings", label: "⚙️ الإعدادات" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [role, setRole] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingTeamRequests, setPendingTeamRequests] = useState(0);
  const [pendingDonations, setPendingDonations] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const [showMenu, setShowMenu] = useState(false);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [cpForm, setCpForm] = useState({ current: "", next: "", confirm: "" });
  const [cpError, setCpError] = useState("");
  const [cpLoading, setCpLoading] = useState(false);
  const [cpSuccess, setCpSuccess] = useState(false);

  const [showAdmins, setShowAdmins] = useState(false);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [newAdmin, setNewAdmin] = useState({ username: "", password: "", role: "SUPER" });
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    target: "ALL",
    activityId: "",
    age: "",
    title: "",
    body: "",
  });
  const [broadcastActivities, setBroadcastActivities] = useState<ActivityOption[]>([]);
  const [broadcastAges, setBroadcastAges] = useState<string[]>([]);
  const [broadcastError, setBroadcastError] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<number | null>(null);

  const isLoginPage = pathname?.startsWith("/admin/login");

  useEffect(() => {
    if (isLoginPage) return;
    fetch("/api/admin/me")
      .then((r) => {
        if (r.status === 401) {
          router.push(loginPathWithNext("/admin/login"));
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data?.role) setRole(data.role);
      })
      .catch(() => {});
    fetch("/api/admin/notifications/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setPendingCount(data.pendingMembers || 0);
        setPendingTeamRequests(data.pendingTeamRequests || 0);
        setPendingDonations(data.pendingDonations || 0);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoginPage]);

  useEffect(() => {
    if (!role || isLoginPage) return;
    const allowedPrefixes =
      role === "MEMBERS"
        ? ["/admin/dashboard", "/admin/payments", "/admin/expenses"]
        : role === "ACTIVITIES"
          ? ["/admin/activities", "/admin/payments", "/admin/expenses"]
          : role === "QUIZ"
            ? ["/admin/quiz"]
            : null;
    if (allowedPrefixes && pathname && !allowedPrefixes.some((p) => pathname.startsWith(p))) {
      router.push(`${allowedPrefixes[0]}?denied=1`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, pathname, isLoginPage]);

  // Show a brief explanation instead of silently bouncing — then clean the
  // URL so a refresh/share of the link doesn't keep re-showing it.
  useEffect(() => {
    if (typeof window === "undefined" || !window.location.search.includes("denied=1")) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPermissionDenied(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("denied");
    router.replace(url.pathname + url.search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useInactivityLogout(IDLE_TIMEOUT_MS, logout, !isLoginPage);

  if (isLoginPage) {
    return <>{children}</>;
  }

  const visibleTabs = NAV_TABS.filter((tab) => {
    if (!role || role === "SUPER") return true;
    if (role === "MEMBERS")
      return (
        tab.href === "/admin/dashboard" ||
        tab.href === "/admin/payments" ||
        tab.href === "/admin/expenses"
      );
    if (role === "ACTIVITIES")
      return (
        tab.href === "/admin/activities" ||
        tab.href === "/admin/payments" ||
        tab.href === "/admin/expenses"
      );
    if (role === "QUIZ") return tab.href === "/admin/quiz";
    return true;
  });

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setCpError("");
    if (cpForm.next !== cpForm.confirm) {
      setCpError("كلمتا المرور غير متطابقتين");
      return;
    }
    if (cpForm.next.length < 3) {
      setCpError("كلمة المرور يجب أن تكون 3 أحرف على الأقل");
      return;
    }
    setCpLoading(true);
    try {
      await api.post("/api/admin/change-password", {
        currentPassword: cpForm.current,
        newPassword: cpForm.next,
      });
      setCpSuccess(true);
      setCpForm({ current: "", next: "", confirm: "" });
      setTimeout(() => {
        setShowChangePassword(false);
        setCpSuccess(false);
      }, 1500);
    } catch (e) {
      setCpError(errorMessage(e));
    } finally {
      setCpLoading(false);
    }
  }

  async function loadAdmins() {
    try {
      const res = await fetch("/api/admin/admins");
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch {
      // ignore
    }
  }

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault();
    setAdminError("");
    setAdminLoading(true);
    try {
      await api.post("/api/admin/admins", newAdmin);
      setNewAdmin({ username: "", password: "", role: "SUPER" });
      await loadAdmins();
    } catch (e) {
      setAdminError(errorMessage(e));
    } finally {
      setAdminLoading(false);
    }
  }

  async function deleteAdmin(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الحساب؟")) return;
    try {
      await api.del(`/api/admin/admins/${id}`);
      await loadAdmins();
    } catch (e) {
      alert(errorMessage(e));
    }
  }

  async function loadAuditLog() {
    setAuditLoading(true);
    try {
      const res = await fetch("/api/admin/audit-log");
      const data = await res.json();
      setAuditLogs(data.logs || []);
    } finally {
      setAuditLoading(false);
    }
  }

  async function openBroadcast() {
    setShowBroadcast(true);
    setBroadcastSuccess(null);
    setBroadcastError("");
    try {
      const [activitiesRes, agesRes] = await Promise.all([
        fetch("/api/admin/activities"),
        fetch("/api/ages"),
      ]);
      const activitiesData = await activitiesRes.json();
      const agesData = await agesRes.json();
      setBroadcastActivities(
        (activitiesData.activities || []).map((a: { id: string; title: string }) => ({
          id: a.id,
          title: a.title,
        })),
      );
      setBroadcastAges(agesData.ages || []);
    } catch {
      // ignore — selects just stay empty
    }
  }

  async function sendBroadcast(e: React.FormEvent) {
    e.preventDefault();
    setBroadcastError("");
    setBroadcastSuccess(null);
    setBroadcastLoading(true);
    try {
      const data = await api.post<{ recipientCount: number }>(
        "/api/admin/notifications/broadcast",
        broadcastForm,
      );
      setBroadcastSuccess(data.recipientCount);
      setBroadcastForm({ target: "ALL", activityId: "", age: "", title: "", body: "" });
    } catch (e) {
      setBroadcastError(errorMessage(e));
    } finally {
      setBroadcastLoading(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--mint-50)", direction: "rtl" }}>
      <div
        className="px-4 py-3 flex items-center justify-between sticky top-0 z-30"
        style={{
          background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))",
          boxShadow: "0 2px 12px rgba(26,63,51,0.2)",
        }}
      >
        <div className="flex items-center gap-3">
          <Image src="/version-final.png" alt="شعار" width={36} height={36} />
          <p className="text-sm font-black text-white leading-none">لوحة تحكم المشرف</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMenu(true)}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
            style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}
          >
            ⚙️ إعدادات
          </button>
          <button
            onClick={logout}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
            style={{
              background: "rgba(239,68,68,0.2)",
              color: "#fca5a5",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            خروج
          </button>
        </div>
      </div>

      <div
        className="px-4 py-2 flex items-center gap-2 sticky top-[52px] z-20"
        style={{ background: "white", borderBottom: "1px solid var(--mint-100)" }}
      >
        {visibleTabs.map((tab) => {
          const active = pathname === tab.href || pathname?.startsWith(tab.href + "/");
          return (
            <button
              key={tab.href}
              onClick={() => router.push(tab.href)}
              className="text-sm font-bold px-3 py-1.5 rounded-lg relative"
              style={{
                background: active ? "var(--mint-700)" : "transparent",
                color: active ? "white" : "var(--text-main)",
              }}
            >
              {tab.label}
              {tab.href === "/admin/dashboard" && pendingCount > 0 && (
                <span
                  className="absolute -top-1 -left-1 rounded-full text-white font-black flex items-center justify-center"
                  style={{ background: "#dc2626", fontSize: "9px", width: "16px", height: "16px" }}
                >
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
              {tab.href === "/admin/activities" && pendingTeamRequests > 0 && (
                <span
                  className="absolute -top-1 -left-1 rounded-full text-white font-black flex items-center justify-center"
                  style={{ background: "#dc2626", fontSize: "9px", width: "16px", height: "16px" }}
                >
                  {pendingTeamRequests > 9 ? "9+" : pendingTeamRequests}
                </span>
              )}
              {tab.href === "/admin/payments" && pendingDonations > 0 && (
                <span
                  className="absolute -top-1 -left-1 rounded-full text-white font-black flex items-center justify-center"
                  style={{ background: "#dc2626", fontSize: "9px", width: "16px", height: "16px" }}
                >
                  {pendingDonations > 9 ? "9+" : pendingDonations}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {permissionDenied && (
        <div
          className="mx-4 mt-3 p-3 rounded-xl text-sm font-semibold flex items-center justify-between gap-2"
          style={{ background: "#fef3c7", color: "#92400e" }}
        >
          <span>🔒 ليس لديك صلاحية للوصول إلى تلك الصفحة</span>
          <button onClick={() => setPermissionDenied(false)} className="font-black">
            ✕
          </button>
        </div>
      )}

      {children}

      {/* Settings menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowMenu(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl md:rounded-2xl overflow-hidden"
            style={{ background: "var(--mint-50)", direction: "rtl" }}
          >
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background: "var(--mint-300)" }} />
            </div>
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
            >
              <h2 className="font-black text-white text-base">⚙️ إعدادات</h2>
              <button
                onClick={() => setShowMenu(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowChangePassword(true);
                }}
                className="w-full text-right p-3 rounded-xl font-semibold text-sm card"
              >
                🔑 تغيير كلمة المرور
              </button>
              {role === "SUPER" && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowAdmins(true);
                    loadAdmins();
                  }}
                  className="w-full text-right p-3 rounded-xl font-semibold text-sm card"
                >
                  👥 إدارة حسابات المشرفين
                </button>
              )}
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowAuditLog(true);
                  loadAuditLog();
                }}
                className="w-full text-right p-3 rounded-xl font-semibold text-sm card"
              >
                📜 سجل الإجراءات
              </button>
              {role === "SUPER" && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    openBroadcast();
                  }}
                  className="w-full text-right p-3 rounded-xl font-semibold text-sm card"
                >
                  📣 إرسال إشعار جماعي
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Change admin password */}
      {showChangePassword && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowChangePassword(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: "var(--mint-50)", direction: "rtl" }}
          >
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
            >
              <h2 className="font-black text-white text-base">تغيير كلمة المرور</h2>
              <button
                onClick={() => setShowChangePassword(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={changePassword} className="p-5 space-y-3">
              <div>
                <label
                  className="block text-sm font-bold mb-1.5"
                  style={{ color: "var(--text-main)" }}
                >
                  كلمة المرور الحالية
                </label>
                <input
                  type="password"
                  value={cpForm.current}
                  onChange={(e) => setCpForm((p) => ({ ...p, current: e.target.value }))}
                  required
                  className="input"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-bold mb-1.5"
                  style={{ color: "var(--text-main)" }}
                >
                  كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  value={cpForm.next}
                  onChange={(e) => setCpForm((p) => ({ ...p, next: e.target.value }))}
                  required
                  className="input"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-bold mb-1.5"
                  style={{ color: "var(--text-main)" }}
                >
                  تأكيد كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  value={cpForm.confirm}
                  onChange={(e) => setCpForm((p) => ({ ...p, confirm: e.target.value }))}
                  required
                  className="input"
                />
              </div>

              {cpError && (
                <div
                  className="p-3 rounded-xl text-sm font-semibold"
                  style={{ background: "#fee2e2", color: "#991b1b" }}
                >
                  ⚠️ {cpError}
                </div>
              )}
              {cpSuccess && (
                <div
                  className="p-3 rounded-xl text-sm font-semibold"
                  style={{ background: "#d1fae5", color: "#065f46" }}
                >
                  ✅ تم تغيير كلمة المرور
                </div>
              )}

              <button type="submit" disabled={cpLoading} className="btn btn-primary mt-1">
                {cpLoading ? "..." : "تغيير كلمة المرور"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manage admins */}
      {showAdmins && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAdmins(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-t-3xl md:rounded-2xl overflow-y-auto"
            style={{ background: "var(--mint-50)", maxHeight: "88svh", direction: "rtl" }}
          >
            <div
              className="px-5 py-4 flex items-center justify-between sticky top-0"
              style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
            >
              <h2 className="font-black text-white text-base">👥 حسابات المشرفين</h2>
              <button
                onClick={() => setShowAdmins(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-2">
                {admins.map((a) => (
                  <div key={a.id} className="card p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                          {a.username}
                        </p>
                        <span className="badge badge-pending">{ROLE_LABEL[a.role] || a.role}</span>
                      </div>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        منذ {new Date(a.createdAt).toLocaleDateString("ar")} —{" "}
                        {new Date(a.createdAt).toLocaleTimeString("ar", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {a.lastLoginAt
                          ? `آخر دخول: ${new Date(a.lastLoginAt).toLocaleDateString("ar")} — ${new Date(a.lastLoginAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })} — ${a.lastLoginIp || "—"}`
                          : "لم يسجّل الدخول بعد"}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteAdmin(a.id)}
                      className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
                      style={{ background: "#fee2e2", color: "#991b1b" }}
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={createAdmin} className="card p-4 space-y-3">
                <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
                  ➕ إضافة مشرف جديد
                </p>
                <input
                  type="text"
                  placeholder="اسم المستخدم"
                  value={newAdmin.username}
                  onChange={(e) => setNewAdmin((p) => ({ ...p, username: e.target.value }))}
                  required
                  maxLength={30}
                  className="input"
                />
                <input
                  type="password"
                  placeholder="كلمة المرور"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin((p) => ({ ...p, password: e.target.value }))}
                  required
                  className="input"
                />
                <select
                  value={newAdmin.role}
                  onChange={(e) => setNewAdmin((p) => ({ ...p, role: e.target.value }))}
                  className="input"
                >
                  <option value="SUPER">كامل الصلاحيات</option>
                  <option value="MEMBERS">الأعضاء فقط</option>
                  <option value="ACTIVITIES">الأنشطة فقط</option>
                  <option value="QUIZ">المسابقة الثقافية فقط</option>
                </select>
                {adminError && (
                  <div
                    className="p-3 rounded-xl text-sm font-semibold"
                    style={{ background: "#fee2e2", color: "#991b1b" }}
                  >
                    ⚠️ {adminError}
                  </div>
                )}
                <button type="submit" disabled={adminLoading} className="btn btn-primary text-sm">
                  {adminLoading ? "..." : "إضافة"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Audit log */}
      {showAuditLog && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAuditLog(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-t-3xl md:rounded-2xl overflow-y-auto"
            style={{ background: "var(--mint-50)", maxHeight: "88svh", direction: "rtl" }}
          >
            <div
              className="px-5 py-4 flex items-center justify-between sticky top-0"
              style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
            >
              <h2 className="font-black text-white text-base">📜 سجل الإجراءات</h2>
              <button
                onClick={() => setShowAuditLog(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-2">
              {auditLoading ? (
                <div className="text-center py-8" style={{ color: "var(--mint-500)" }}>
                  ⏳
                </div>
              ) : auditLogs.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
                  لا يوجد سجل بعد
                </p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="card p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                        {ACTION_LABELS[log.action] || log.action}
                      </p>
                      <span
                        className="text-xs shrink-0"
                        style={{ color: "var(--text-muted)" }}
                        dir="ltr"
                      >
                        {new Date(log.createdAt).toLocaleDateString("ar")}{" "}
                        {new Date(log.createdAt).toLocaleTimeString("ar", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {log.targetLabel && (
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        {log.targetLabel}
                      </p>
                    )}
                    <p className="text-xs mt-1 font-semibold" style={{ color: "var(--mint-600)" }}>
                      بواسطة {log.adminUsername}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Broadcast notification */}
      {showBroadcast && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowBroadcast(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-t-3xl md:rounded-2xl overflow-y-auto"
            style={{ background: "var(--mint-50)", maxHeight: "88svh", direction: "rtl" }}
          >
            <div
              className="px-5 py-4 flex items-center justify-between sticky top-0"
              style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
            >
              <h2 className="font-black text-white text-base">📣 إرسال إشعار جماعي</h2>
              <button
                onClick={() => setShowBroadcast(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={sendBroadcast} className="p-5 space-y-3">
              <div>
                <label
                  className="block text-sm font-bold mb-1.5"
                  style={{ color: "var(--text-main)" }}
                >
                  المستلمون
                </label>
                <select
                  value={broadcastForm.target}
                  onChange={(e) => setBroadcastForm((p) => ({ ...p, target: e.target.value }))}
                  className="input"
                >
                  <option value="ALL">كل الأعضاء النشطين</option>
                  <option value="ACTIVITY">المسجلون في نشاط معيّن</option>
                  <option value="AGE">عصر معيّن</option>
                </select>
              </div>

              {broadcastForm.target === "ACTIVITY" && (
                <select
                  value={broadcastForm.activityId}
                  onChange={(e) => setBroadcastForm((p) => ({ ...p, activityId: e.target.value }))}
                  required
                  className="input"
                >
                  <option value="" disabled>
                    اختر النشاط...
                  </option>
                  {broadcastActivities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              )}

              {broadcastForm.target === "AGE" && (
                <select
                  value={broadcastForm.age}
                  onChange={(e) => setBroadcastForm((p) => ({ ...p, age: e.target.value }))}
                  required
                  className="input"
                >
                  <option value="" disabled>
                    اختر العصر...
                  </option>
                  {broadcastAges.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              )}

              <input
                type="text"
                placeholder="عنوان الإشعار"
                value={broadcastForm.title}
                onChange={(e) => setBroadcastForm((p) => ({ ...p, title: e.target.value }))}
                required
                maxLength={60}
                className="input"
              />
              <textarea
                placeholder="نص الإشعار"
                value={broadcastForm.body}
                onChange={(e) => setBroadcastForm((p) => ({ ...p, body: e.target.value }))}
                required
                maxLength={300}
                rows={3}
                className="input"
              />

              {broadcastError && (
                <div
                  className="p-3 rounded-xl text-sm font-semibold"
                  style={{ background: "#fee2e2", color: "#991b1b" }}
                >
                  ⚠️ {broadcastError}
                </div>
              )}
              {broadcastSuccess !== null && (
                <div
                  className="p-3 rounded-xl text-sm font-semibold"
                  style={{ background: "#d1fae5", color: "#065f46" }}
                >
                  ✅ تم الإرسال إلى {broadcastSuccess} عضو
                </div>
              )}

              <button type="submit" disabled={broadcastLoading} className="btn btn-primary text-sm">
                {broadcastLoading ? "..." : "إرسال"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
