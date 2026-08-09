"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Status = "PENDING" | "ACTIVE" | "REJECTED";
type FilterTab = "ALL" | Status;

interface Member {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  age: string;
  paymentMethod: string;
  paymentProof: string;
  status: Status;
  createdAt: string;
  user?: { phone: string };
}

const STATUS_LABEL: Record<Status, string> = {
  PENDING: "قيد الانتظار",
  ACTIVE: "مقبول",
  REJECTED: "غير مقبول",
};

const STATUS_BADGE: Record<Status, string> = {
  PENDING: "badge-pending",
  ACTIVE: "badge-active",
  REJECTED: "badge-rejected",
};

export default function AdminDashboard() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("PENDING");
  const [selected, setSelected] = useState<Member | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [proofZoom, setProofZoom] = useState(false);
  const [search, setSearch] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [cpForm, setCpForm] = useState({ current: "", next: "", confirm: "" });
  const [cpError, setCpError] = useState("");
  const [cpLoading, setCpLoading] = useState(false);
  const [cpSuccess, setCpSuccess] = useState(false);

  useEffect(() => { fetchMembers(); }, []);

  async function fetchMembers() {
    try {
      const res = await fetch("/api/admin/members");
      if (res.status === 401) { router.push("/admin/login"); return; }
      const data = await res.json();
      setMembers(data.members || []);
    } catch {
      router.push("/admin/login");
    } finally {
      setLoading(false);
    }
  }

  async function validate(id: string, action: "ACTIVE" | "REJECTED") {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) throw new Error("فشلت العملية");
      await fetchMembers();
      setSelected(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setActionLoading(false);
    }
  }

  async function resetPassword(userId: string) {
    setResetLoading(true);
    setTempPassword(null);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setTempPassword(data.tempPassword);
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setResetLoading(false);
    }
  }

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
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: cpForm.current, newPassword: cpForm.next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setCpSuccess(true);
      setCpForm({ current: "", next: "", confirm: "" });
      setTimeout(() => { setShowChangePassword(false); setCpSuccess(false); }, 1500);
    } catch (e) {
      setCpError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setCpLoading(false);
    }
  }

  const counts = {
    ALL: members.length,
    PENDING: members.filter((m) => m.status === "PENDING").length,
    ACTIVE: members.filter((m) => m.status === "ACTIVE").length,
    REJECTED: members.filter((m) => m.status === "REJECTED").length,
  };

  const filtered = members.filter((m) => {
    const matchFilter = filter === "ALL" || m.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || m.fullName.includes(q) || m.phone.includes(q) || (m.user?.phone || "").includes(q);
    return matchFilter && matchSearch;
  });

  return (
    <div className="min-h-screen" style={{ background: "var(--mint-50)", direction: "rtl" }}>

      {/* Top bar */}
      <div
        className="px-4 py-3 flex items-center justify-between sticky top-0 z-30"
        style={{
          background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))",
          boxShadow: "0 2px 12px rgba(26,63,51,0.2)",
        }}
      >
        <div className="flex items-center gap-3">
          <Image src="/version-final.png" alt="شعار" width={36} height={36} />
          <div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>رابطة شباب</p>
            <p className="text-sm font-black text-white leading-none">لوحة تحكم المشرف</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowChangePassword(true)}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
            style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}
          >
            🔑 كلمة المرور
          </button>
          <button
            onClick={logout}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
            style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            خروج
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Stat chips */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {(["ALL", "PENDING", "ACTIVE", "REJECTED"] as FilterTab[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="rounded-xl py-3 px-2 text-center transition-all"
              style={{
                background: filter === s ? "var(--mint-700)" : "white",
                color: filter === s ? "white" : "var(--text-main)",
                boxShadow: filter === s
                  ? "0 2px 8px rgba(26,63,51,0.25)"
                  : "0 1px 4px rgba(0,0,0,0.06)",
                border: filter === s ? "none" : "1px solid var(--mint-100)",
              }}
            >
              <div className="text-xl font-black leading-none mb-0.5">{counts[s]}</div>
              <div className="text-xs font-semibold opacity-80">
                {s === "ALL" ? "الكل"
                  : s === "PENDING" ? "انتظار"
                  : s === "ACTIVE" ? "مقبول"
                  : "مرفوض"}
              </div>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="بحث بالاسم أو الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ background: "white" }}
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-16" style={{ color: "var(--mint-500)" }}>
            <div className="text-4xl animate-pulse mb-3">⏳</div>
            <p className="text-sm font-semibold">جاري التحميل...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center" style={{ color: "var(--text-muted)" }}>
            <div className="text-4xl mb-3">📭</div>
            <p className="font-semibold">لا توجد طلبات في هذا القسم</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((m) => (
              <button
                key={m.id}
                onClick={() => { setSelected(m); setProofZoom(false); setTempPassword(null); }}
                className="card w-full p-4 text-right transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-black text-white"
                      style={{
                        background:
                          m.status === "ACTIVE" ? "var(--mint-600)"
                          : m.status === "REJECTED" ? "#dc2626"
                          : "var(--copper-500)",
                      }}
                    >
                      {m.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold truncate" style={{ color: "var(--text-main)" }}>
                        {m.fullName}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }} dir="ltr">
                        {m.phone}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className={`badge ${STATUS_BADGE[m.status]}`}>
                      {STATUS_LABEL[m.status]}
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>›</span>
                  </div>
                </div>
                <div
                  className="flex gap-3 mt-2 text-xs"
                  style={{ color: "var(--text-muted)", paddingRight: "52px" }}
                >
                  <span>العصر: {m.age}</span>
                  <span>•</span>
                  <span>{m.paymentMethod}</span>
                  <span>•</span>
                  <span dir="ltr">
                    {new Date(m.createdAt).toLocaleDateString("ar-MA")}{" "}
                    {new Date(m.createdAt).toLocaleTimeString("ar-MA", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) { setSelected(null); setProofZoom(false); setTempPassword(null); }
          }}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl md:rounded-2xl overflow-y-auto"
            style={{ background: "var(--mint-50)", maxHeight: "92svh", direction: "rtl" }}
          >
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background: "var(--mint-300)" }} />
            </div>

            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
            >
              <h2 className="font-black text-white text-lg">تفاصيل الطلب</h2>
              <button
                onClick={() => { setSelected(null); setProofZoom(false); setTempPassword(null); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Info */}
              <div className="card p-4 space-y-3">
                {([
                  ["الاسم الكامل", selected.fullName, undefined],
                  ["رقم الهاتف", selected.phone, "ltr"],
                  ["حساب التطبيق", selected.user?.phone || "—", "ltr"],
                  ["العصر", selected.age, undefined],
                  ["طريقة الدفع", selected.paymentMethod, undefined],
                  ["تاريخ الطلب", new Date(selected.createdAt).toLocaleDateString("ar-MA", { year: "numeric", month: "long", day: "numeric" }), undefined],
                  ["وقت الطلب", new Date(selected.createdAt).toLocaleTimeString("ar-MA", { hour: "2-digit", minute: "2-digit" }), "ltr"],
                ] as [string, string, string | undefined][]).map(([label, value, dir]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="text-sm shrink-0" style={{ color: "var(--text-muted)" }}>{label}</span>
                    <span className="text-sm font-bold" style={{ color: "var(--text-main)" }} dir={dir}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Status */}
              <div className="flex items-center justify-between card p-4">
                <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>الحالة</span>
                <span className={`badge ${STATUS_BADGE[selected.status]}`}>{STATUS_LABEL[selected.status]}</span>
              </div>

              {/* Reset password */}
              <div className="card p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
                    🔑 كلمة مرور الحساب
                  </span>
                  <button
                    onClick={() => resetPassword(selected.userId)}
                    disabled={resetLoading}
                    className="text-xs px-3 py-1.5 rounded-lg font-bold"
                    style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                  >
                    {resetLoading ? "..." : "إعادة تعيين"}
                  </button>
                </div>
                {tempPassword && (
                  <div
                    className="mt-3 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2"
                    style={{ background: "var(--mint-50)", border: "1px solid var(--mint-200)" }}
                  >
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>
                        كلمة المرور الجديدة — سلّمها للعضو
                      </p>
                      <p className="font-mono font-black text-lg" style={{ color: "var(--mint-700)" }} dir="ltr">
                        {tempPassword}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(tempPassword)}
                      className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
                      style={{ background: "var(--mint-600)", color: "white" }}
                    >
                      نسخ
                    </button>
                  </div>
                )}
              </div>

              {/* Proof image */}
              <div>
                <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>📸 صورة الكابتير</p>
                <div
                  className="rounded-2xl overflow-hidden cursor-zoom-in border-2"
                  style={{ borderColor: "var(--mint-300)" }}
                  onClick={() => setProofZoom(true)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/files/${selected.paymentProof}`}
                    alt="كابتير"
                    className="w-full object-contain max-h-56"
                    style={{ background: "#f3f4f6" }}
                  />
                </div>
                <p className="text-xs text-center mt-1" style={{ color: "var(--text-muted)" }}>انقر للتكبير</p>
              </div>

              {/* Actions */}
              {selected.status === "PENDING" && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => validate(selected.id, "ACTIVE")}
                    disabled={actionLoading}
                    className="btn btn-primary text-sm"
                  >
                    {actionLoading ? "..." : "✅ قبول"}
                  </button>
                  <button
                    onClick={() => validate(selected.id, "REJECTED")}
                    disabled={actionLoading}
                    className="btn text-sm font-bold"
                    style={{ background: "#dc2626", color: "white" }}
                  >
                    {actionLoading ? "..." : "❌ رفض"}
                  </button>
                </div>
              )}
              {selected.status === "ACTIVE" && (
                <button
                  onClick={() => validate(selected.id, "REJECTED")}
                  disabled={actionLoading}
                  className="btn w-full text-sm font-bold"
                  style={{ background: "#fee2e2", color: "#991b1b" }}
                >
                  {actionLoading ? "..." : "تغيير إلى مرفوض"}
                </button>
              )}
              {selected.status === "REJECTED" && (
                <button
                  onClick={() => validate(selected.id, "ACTIVE")}
                  disabled={actionLoading}
                  className="btn btn-primary w-full text-sm"
                >
                  {actionLoading ? "..." : "تغيير إلى مقبول"}
                </button>
              )}
              <div className="pb-2" />
            </div>
          </div>
        </div>
      )}

      {/* Proof fullscreen zoom */}
      {proofZoom && selected && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={() => setProofZoom(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/files/${selected.paymentProof}`}
            alt="كابتير"
            className="max-w-full max-h-full object-contain rounded-2xl"
          />
          <button
            className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
            style={{ background: "rgba(255,255,255,0.15)" }}
            onClick={() => setProofZoom(false)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Change admin password */}
      {showChangePassword && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowChangePassword(false); }}
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
                <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
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
                <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
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
                <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
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
                <div className="p-3 rounded-xl text-sm font-semibold" style={{ background: "#fee2e2", color: "#991b1b" }}>
                  ⚠️ {cpError}
                </div>
              )}
              {cpSuccess && (
                <div className="p-3 rounded-xl text-sm font-semibold" style={{ background: "#d1fae5", color: "#065f46" }}>
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
    </div>
  );
}
