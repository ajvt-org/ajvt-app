"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BarChart from "@/components/admin/BarChart";
import { loginPathWithNext } from "@/lib/utils";
import { MEMBERSHIP_FEE, validatePaidAmount } from "@/lib/donations";

type Status = "PENDING" | "ACTIVE" | "REJECTED";
type FilterTab = "ALL" | Status;

interface Member {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  age: string;
  paymentMethod: string;
  paymentProof: string | null;
  photo: string | null;
  paidAmount: number | null;
  status: Status;
  memberNumber: string | null;
  createdAt: string;
  user?: { phone: string };
  registrations?: { activityId: string; activity: { id: string; title: string } }[];
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

const PAYMENT_METHODS = ["بنكيلي", "السداد", "مصرفي", "نقداً"];
const DEFAULT_AGES = ["البدريين", "الفائزين", "النجميين", "المجاهدين", "المنصورين", "الخاشعين", "التائبين"];

const emptyManualForm = {
  accountPhone: "",
  fullName: "",
  memberPhone: "",
  age: "",
  paymentMethod: "",
  paidAmount: "",
  status: "ACTIVE" as "PENDING" | "ACTIVE",
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
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [editPhotoUploading, setEditPhotoUploading] = useState(false);
  const [editPaidAmount, setEditPaidAmount] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualForm, setManualForm] = useState(emptyManualForm);
  const [manualError, setManualError] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualResult, setManualResult] = useState<{ tempPassword?: string } | null>(null);
  const [manualProof, setManualProof] = useState<string | null>(null);
  const [manualProofPreview, setManualProofPreview] = useState<string | null>(null);
  const [manualProofUploading, setManualProofUploading] = useState(false);

  async function handleManualProofChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setManualProofPreview(URL.createObjectURL(file));
    setManualProofUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل رفع الملف");
      setManualProof(data.filename);
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "فشل رفع الملف");
      setManualProofPreview(null);
    } finally {
      setManualProofUploading(false);
    }
  }

  useEffect(() => { fetchMembers(); }, []);

  async function fetchMembers() {
    try {
      const res = await fetch("/api/admin/members");
      if (res.status === 401) { router.push(loginPathWithNext("/admin/login")); return; }
      const data = await res.json();
      setMembers(data.members || []);
    } catch {
      router.push(loginPathWithNext("/admin/login"));
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

  async function deleteMember(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب نهائياً؟ لا يمكن التراجع عن هذا الإجراء.")) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشلت العملية");
      await fetchMembers();
      setSelected(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setDeleteLoading(false);
    }
  }

  function startEdit() {
    if (!selected) return;
    setEditName(selected.fullName);
    setEditPhoto(selected.photo);
    setEditPhotoPreview(selected.photo ? `/api/files/${selected.photo}` : null);
    setEditPaidAmount(selected.paidAmount != null ? String(selected.paidAmount) : "");
    setEditError("");
    setEditing(true);
  }

  async function handleEditPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditPhotoPreview(URL.createObjectURL(file));
    setEditPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل رفع الملف");
      setEditPhoto(data.filename);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "فشل رفع الملف");
    } finally {
      setEditPhotoUploading(false);
    }
  }

  async function saveEdit() {
    if (!selected) return;
    if (!editName.trim()) { setEditError("الاسم الكامل مطلوب"); return; }
    let paidAmountValue: number | null = null;
    if (editPaidAmount.trim()) {
      const paidAmountError = validatePaidAmount(editPaidAmount);
      if (paidAmountError) { setEditError(paidAmountError); return; }
      paidAmountValue = Number(editPaidAmount);
    }
    setEditSaving(true);
    setEditError("");
    try {
      const res = await fetch(`/api/admin/members/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: editName.trim(), photo: editPhoto, paidAmount: paidAmountValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setMembers((prev) => prev.map((m) => (m.id === selected.id ? { ...m, ...data.member } : m)));
      setSelected((prev) => (prev ? { ...prev, ...data.member } : prev));
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setEditSaving(false);
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

  async function createManualMember(e: React.FormEvent) {
    e.preventDefault();
    setManualError("");
    setManualResult(null);
    setManualLoading(true);
    try {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...manualForm, paymentProof: manualProof }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setManualResult({ tempPassword: data.tempPassword });
      setManualForm(emptyManualForm);
      setManualProof(null);
      setManualProofPreview(null);
      await fetchMembers();
    } catch (e) {
      setManualError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setManualLoading(false);
    }
  }

  function exportCSV() {
    const headers = ["الاسم الكامل", "رقم الهاتف", "حساب التطبيق", "العصر", "طريقة الدفع", "الحالة", "رقم العضوية", "تاريخ الطلب"];
    const rows = members.map((m) => [
      m.fullName,
      m.phone,
      m.user?.phone || "",
      m.age,
      m.paymentMethod,
      STATUS_LABEL[m.status],
      m.memberNumber || "",
      new Date(m.createdAt).toLocaleString("ar"),
    ]);
    const csv = "﻿" + [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const counts = {
    ALL: members.length,
    PENDING: members.filter((m) => m.status === "PENDING").length,
    ACTIVE: members.filter((m) => m.status === "ACTIVE").length,
    REJECTED: members.filter((m) => m.status === "REJECTED").length,
  };

  const ageBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    members.forEach((m) => { map[m.age] = (map[m.age] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [members]);

  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    members.forEach((m) => { map[m.paymentMethod] = (map[m.paymentMethod] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [members]);

  const signupsByDay = useMemo(() => {
    const days: { label: string; value: number }[] = [];
    const counts: Record<string, number> = {};
    members.forEach((m) => {
      const key = new Date(m.createdAt).toISOString().slice(0, 10);
      counts[key] = (counts[key] || 0) + 1;
    });
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ label: String(d.getDate()), value: counts[key] || 0 });
    }
    return days;
  }, [members]);

  const filtered = members.filter((m) => {
    const matchFilter = filter === "ALL" || m.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || m.fullName.includes(q) || m.phone.includes(q) || (m.user?.phone || "").includes(q);
    return matchFilter && matchSearch;
  });

  return (
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

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowStats((v) => !v)}
          className="flex-1 text-sm font-bold px-4 py-2.5 rounded-xl flex items-center justify-between"
          style={{ background: "white", color: "var(--mint-700)", border: "1px solid var(--mint-100)" }}
        >
          <span>📊 الإحصائيات</span>
          <span>{showStats ? "▲" : "▼"}</span>
        </button>
        <button
          onClick={exportCSV}
          className="text-sm font-bold px-4 py-2.5 rounded-xl"
          style={{ background: "white", color: "var(--mint-700)", border: "1px solid var(--mint-100)" }}
        >
          📥 CSV
        </button>
      </div>

      {showStats && (
        <div className="space-y-3 mb-5">
          <div className="card p-4">
            <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>التسجيلات خلال آخر 14 يوماً</p>
            <BarChart data={signupsByDay} />
          </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>حسب العصر</p>
            <div className="space-y-1.5">
              {ageBreakdown.map(([age, count]) => (
                <div key={age} className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--text-main)" }} className="truncate">{age}</span>
                  <span className="font-black shrink-0" style={{ color: "var(--mint-600)" }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-4">
            <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>حسب طريقة الدفع</p>
            <div className="space-y-1.5">
              {paymentBreakdown.map(([method, count]) => (
                <div key={method} className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--text-main)" }} className="truncate">{method}</span>
                  <span className="font-black shrink-0" style={{ color: "var(--mint-600)" }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Search + manual add */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="بحث بالاسم أو الهاتف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1"
          style={{ background: "white" }}
        />
        <button
          onClick={() => { setShowManualAdd(true); setManualResult(null); setManualError(""); }}
          className="btn btn-primary text-sm px-4"
          style={{ width: "auto" }}
        >
          ➕ إضافة عضو يدوياً
        </button>
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
              onClick={() => { setSelected(m); setProofZoom(false); setTempPassword(null); setEditing(false); }}
              className="card w-full p-4 text-right transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {m.photo ? (
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/files/${m.photo}`} alt={m.fullName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
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
                  )}
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
                  {new Date(m.createdAt).toLocaleDateString("ar")}{" "}
                  {new Date(m.createdAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

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
                onClick={() => { setSelected(null); setProofZoom(false); setTempPassword(null); setEditing(false); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Photo + name (editable) */}
              <div className="card p-4 flex items-center gap-4">
                <div className="relative shrink-0">
                  {editing ? (
                    <label className="cursor-pointer block">
                      <div
                        className="w-16 h-16 rounded-full overflow-hidden border-2"
                        style={{ borderColor: "var(--mint-300)" }}
                      >
                        {editPhotoPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={editPhotoPreview} alt={editName} className="w-full h-full object-cover" />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-xl font-black text-white"
                            style={{ background: "var(--mint-600)" }}
                          >
                            {editName.charAt(0) || "?"}
                          </div>
                        )}
                      </div>
                      <span
                        className="absolute -bottom-1 -left-1 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center text-white"
                        style={{ background: "var(--mint-700)" }}
                      >
                        📷
                      </span>
                      <input type="file" accept="image/*" onChange={handleEditPhotoChange} style={{ display: "none" }} />
                    </label>
                  ) : selected.photo ? (
                    <div className="w-16 h-16 rounded-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/files/${selected.photo}`} alt={selected.fullName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black text-white"
                      style={{ background: "var(--mint-600)" }}
                    >
                      {selected.fullName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={30}
                      className="input"
                    />
                  ) : (
                    <p className="font-black text-lg truncate" style={{ color: "var(--text-main)" }}>
                      {selected.fullName}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => (editing ? setEditing(false) : startEdit())}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0"
                  style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                >
                  {editing ? "إلغاء" : "✏️ تعديل"}
                </button>
              </div>

              {editing && (
                <div className="card p-3 space-y-2">
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: "var(--text-main)" }}>
                      المبلغ المسدد (أوقية)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={MEMBERSHIP_FEE}
                      value={editPaidAmount}
                      onChange={(e) => setEditPaidAmount(e.target.value)}
                      placeholder={String(MEMBERSHIP_FEE)}
                      className="input"
                      dir="ltr"
                    />
                  </div>
                  {editError && (
                    <div className="p-2 rounded-lg text-xs font-semibold mb-2" style={{ background: "#fee2e2", color: "#991b1b" }}>
                      ⚠️ {editError}
                    </div>
                  )}
                  <button
                    onClick={saveEdit}
                    disabled={editSaving || editPhotoUploading}
                    className="btn btn-primary text-sm w-full"
                  >
                    {editPhotoUploading ? "جاري رفع الصورة..." : editSaving ? "..." : "💾 حفظ التعديلات"}
                  </button>
                </div>
              )}

              {/* Info */}
              <div className="card p-4 space-y-3">
                {([
                  ["رقم الهاتف", selected.phone, "ltr"],
                  ["حساب التطبيق", selected.user?.phone || "—", "ltr"],
                  ["العصر", selected.age, undefined],
                  ["طريقة الدفع", selected.paymentMethod, undefined],
                  ["المبلغ المسدد", selected.paidAmount ? `${selected.paidAmount} أوقية` : "—", undefined],
                  ["رقم العضوية", selected.memberNumber || "—", "ltr"],
                  ["تاريخ الطلب", new Date(selected.createdAt).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric", weekday: "long" }), undefined],
                  ["وقت الطلب", new Date(selected.createdAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }), "ltr"],
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

              {/* Registered activities */}
              {selected.registrations && selected.registrations.length > 0 && (
                <div className="card p-4">
                  <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>الأنشطة المسجل بها</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.registrations.map((r) => (
                      <span key={r.activityId} className="badge badge-active">{r.activity.title}</span>
                    ))}
                  </div>
                </div>
              )}

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
                {selected.paymentProof ? (
                  <>
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
                  </>
                ) : (
                  <p className="text-sm card p-3 text-center" style={{ color: "var(--text-muted)" }}>
                    أُضيف يدوياً من طرف المشرف — لا يوجد إثبات دفع
                  </p>
                )}
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

              <button
                onClick={() => deleteMember(selected.id)}
                disabled={deleteLoading}
                className="btn w-full text-sm font-bold"
                style={{ background: "white", color: "#991b1b", border: "1.5px solid #fca5a5" }}
              >
                {deleteLoading ? "..." : "🗑 حذف الطلب نهائياً"}
              </button>

              <div className="pb-2" />
            </div>
          </div>
        </div>
      )}

      {/* Proof fullscreen zoom */}
      {proofZoom && selected?.paymentProof && (
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

      {/* Manual member add */}
      {showManualAdd && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowManualAdd(false); }}
        >
          <div
            className="w-full max-w-md rounded-t-3xl md:rounded-2xl overflow-y-auto"
            style={{ background: "var(--mint-50)", maxHeight: "92svh", direction: "rtl" }}
          >
            <div
              className="px-5 py-4 flex items-center justify-between sticky top-0"
              style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
            >
              <h2 className="font-black text-white text-base">➕ إضافة عضو يدوياً</h2>
              <button
                onClick={() => setShowManualAdd(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3">
              {manualResult ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl text-sm font-semibold" style={{ background: "#d1fae5", color: "#065f46" }}>
                    ✅ تم إنشاء العضو بنجاح
                  </div>
                  {manualResult.tempPassword && (
                    <div
                      className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-2"
                      style={{ background: "white", border: "1px solid var(--mint-200)" }}
                    >
                      <div>
                        <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>
                          كلمة مرور الحساب الجديد — سلّمها للعضو
                        </p>
                        <p className="font-mono font-black text-lg" style={{ color: "var(--mint-700)" }} dir="ltr">
                          {manualResult.tempPassword}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(manualResult.tempPassword!)}
                        className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
                        style={{ background: "var(--mint-600)", color: "white" }}
                      >
                        نسخ
                      </button>
                    </div>
                  )}
                  <button onClick={() => setManualResult(null)} className="btn btn-primary text-sm">
                    إضافة عضو آخر
                  </button>
                </div>
              ) : (
                <form onSubmit={createManualMember} className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
                      رقم هاتف الحساب <span style={{ color: "var(--copper-500)" }}>*</span>
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={manualForm.accountPhone}
                      onChange={(e) => setManualForm((p) => ({ ...p, accountPhone: e.target.value.replace(/\D/g, "").slice(0, 8) }))}
                      placeholder="2XXXXXXX"
                      maxLength={8}
                      required
                      className="input"
                    />
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      إن لم يوجد حساب بهذا الرقم، سيُنشأ حساب جديد تلقائياً بكلمة مرور مؤقتة
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>الاسم الكامل</label>
                    <input
                      type="text"
                      value={manualForm.fullName}
                      onChange={(e) => setManualForm((p) => ({ ...p, fullName: e.target.value }))}
                      maxLength={30}
                      required
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>رقم هاتف العضو</label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={manualForm.memberPhone}
                      onChange={(e) => setManualForm((p) => ({ ...p, memberPhone: e.target.value.replace(/\D/g, "").slice(0, 8) }))}
                      maxLength={8}
                      required
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>العصر</label>
                    <select
                      value={manualForm.age}
                      onChange={(e) => setManualForm((p) => ({ ...p, age: e.target.value }))}
                      required
                      className="input"
                    >
                      <option value="" disabled>اختر العصر...</option>
                      {DEFAULT_AGES.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>طريقة الدفع</label>
                    <select
                      value={manualForm.paymentMethod}
                      onChange={(e) => setManualForm((p) => ({ ...p, paymentMethod: e.target.value }))}
                      required
                      className="input"
                    >
                      <option value="" disabled>اختر...</option>
                      {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
                      المبلغ المسدد (أوقية) — اختياري
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={MEMBERSHIP_FEE}
                      value={manualForm.paidAmount}
                      onChange={(e) => setManualForm((p) => ({ ...p, paidAmount: e.target.value }))}
                      placeholder={String(MEMBERSHIP_FEE)}
                      className="input"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>حالة العضوية</label>
                    <select
                      value={manualForm.status}
                      onChange={(e) => setManualForm((p) => ({ ...p, status: e.target.value as "PENDING" | "ACTIVE" }))}
                      className="input"
                    >
                      <option value="ACTIVE">مقبول مباشرة</option>
                      <option value="PENDING">قيد الانتظار</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
                      صورة إثبات الدفع (اختياري)
                    </label>
                    <label className="upload-zone" style={{ display: "block", cursor: "pointer" }}>
                      {manualProofPreview ? (
                        <div>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={manualProofPreview} alt="إثبات الدفع" className="max-h-32 mx-auto rounded-xl object-contain" />
                          <p className="mt-1 text-xs text-center" style={{ color: "var(--mint-600)" }}>
                            {manualProofUploading ? "جاري الرفع..." : "انقر لتغيير الصورة"}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>
                          📸 انقر لإرفاق صورة (اختياري)
                        </p>
                      )}
                      <input type="file" accept="image/*" onChange={handleManualProofChange} style={{ display: "none" }} />
                    </label>
                  </div>

                  {manualError && (
                    <div className="p-3 rounded-xl text-sm font-semibold" style={{ background: "#fee2e2", color: "#991b1b" }}>
                      ⚠️ {manualError}
                    </div>
                  )}

                  <button type="submit" disabled={manualLoading} className="btn btn-primary text-sm">
                    {manualLoading ? "..." : "إنشاء العضو"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
