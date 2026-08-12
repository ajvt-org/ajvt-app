"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginPathWithNext } from "@/lib/utils";
import PhotoUpload from "@/components/PhotoUpload";

interface Expense {
  id: string;
  label: string;
  amount: number;
  note: string | null;
  proof: string | null;
  date: string;
  createdBy: string;
}

interface NamedEntry {
  name: string;
  amount: number;
}

interface MethodDetail {
  intisab: NamedEntry[];
  daem: NamedEntry[];
  anonymousTotal: number;
}

interface FinanceSummary {
  byMethod: Record<string, number>;
  byMethodDetail: Record<string, MethodDetail>;
  days: { date: string; total: number; byMethod: Record<string, number> }[];
  totalRevenue: number;
  totalExpenses: number;
  net: number;
}

const emptyExpenseForm = { label: "", amount: "", note: "", date: "", proof: "" };

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminExpensesPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyExpenseForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedMethods, setExpandedMethods] = useState<Set<string>>(new Set());

  function toggleMethod(method: string) {
    setExpandedMethods((prev) => {
      const next = new Set(prev);
      if (next.has(method)) next.delete(method); else next.add(method);
      return next;
    });
  }

  function load() {
    return Promise.all([
      fetch("/api/admin/finance/summary").then((r) => {
        if (r.status === 401) { router.push(loginPathWithNext("/admin/login")); return null; }
        return r.ok ? r.json() : null;
      }),
      fetch("/api/admin/expenses").then((r) => (r.ok ? r.json() : null)),
    ]).then(([summaryData, expensesData]) => {
      if (summaryData) setSummary(summaryData);
      if (expensesData?.expenses) setExpenses(expensesData.expenses);
    });
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyExpenseForm, date: todayInputValue() });
    setFormError("");
    setShowForm(true);
  }

  function openEdit(e: Expense) {
    setEditingId(e.id);
    setForm({
      label: e.label,
      amount: String(e.amount),
      note: e.note || "",
      date: e.date.slice(0, 10),
      proof: e.proof || "",
    });
    setFormError("");
    setShowForm(true);
  }

  async function submitForm(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError("");
    if (!form.label.trim()) { setFormError("الوصف مطلوب"); return; }
    const n = Number(form.amount);
    if (!Number.isInteger(n) || n <= 0) { setFormError("المبلغ يجب أن يكون رقماً صحيحاً موجباً"); return; }

    setSaving(true);
    try {
      const body = {
        label: form.label.trim(),
        amount: n,
        note: form.note.trim() || null,
        date: form.date || undefined,
        proof: form.proof || null,
      };
      const res = await fetch(editingId ? `/api/admin/expenses/${editingId}` : "/api/admin/expenses", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setShowForm(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا المصروف؟")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/expenses/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusyId(null);
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

  const byMethod = Object.entries(summary?.byMethod || {}).sort((a, b) => b[1] - a[1]);
  const days = summary?.days || [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>💸 المصاريف والإيرادات</p>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="card p-3 text-center">
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>💰 الإيرادات</p>
          <p className="text-base font-black" style={{ color: "var(--mint-600)" }}>{summary?.totalRevenue ?? 0}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>💸 المصاريف</p>
          <p className="text-base font-black" style={{ color: "var(--copper-500)" }}>{summary?.totalExpenses ?? 0}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>📊 الصافي</p>
          <p className="text-base font-black" style={{ color: "var(--text-main)" }}>{summary?.net ?? 0}</p>
        </div>
      </div>

      {/* By payment method */}
      <div className="card p-4">
        <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>حسب طريقة الدفع (كل الإيرادات)</p>
        {byMethod.length === 0 ? (
          <p className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>لا توجد بيانات بعد</p>
        ) : (
          <div className="space-y-2">
            {byMethod.map(([method, total]) => {
              const detail = summary?.byMethodDetail?.[method];
              const expanded = expandedMethods.has(method);
              return (
                <div key={method}>
                  <button
                    type="button"
                    onClick={() => toggleMethod(method)}
                    className="w-full flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-1.5">
                      <span style={{ color: "var(--mint-600)" }}>{expanded ? "▾" : "◂"}</span>
                      <span style={{ color: "var(--text-main)" }} className="font-bold truncate">{method}</span>
                    </span>
                    <span className="font-black shrink-0" style={{ color: "var(--mint-600)" }}>{total} أوقية</span>
                  </button>

                  {expanded && detail && (
                    <div className="mt-2 mr-4 space-y-2.5 p-2.5 rounded-lg" style={{ background: "var(--mint-50)" }}>
                      <div>
                        <p className="text-xs font-bold mb-1" style={{ color: "var(--text-main)" }}>1- انتساب</p>
                        {detail.intisab.length === 0 ? (
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>لا يوجد</p>
                        ) : (
                          <div className="space-y-0.5">
                            {detail.intisab.map((entry, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="truncate" style={{ color: "var(--text-main)" }}>{entry.name}</span>
                                <span className="font-bold shrink-0" style={{ color: "var(--mint-600)" }}>{entry.amount} أوقية</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold mb-1" style={{ color: "var(--text-main)" }}>2- دعم</p>
                        {detail.daem.length === 0 ? (
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>لا يوجد</p>
                        ) : (
                          <div className="space-y-0.5">
                            {detail.daem.map((entry, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="truncate" style={{ color: "var(--text-main)" }}>{entry.name}</span>
                                <span className="font-bold shrink-0" style={{ color: "var(--mint-600)" }}>{entry.amount} أوقية</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {detail.anonymousTotal > 0 && (
                        <div className="flex items-center justify-between text-xs pt-1.5" style={{ borderTop: "1px solid var(--mint-100)" }}>
                          <span style={{ color: "var(--text-muted)" }}>🤍 فاعل خير</span>
                          <span className="font-bold shrink-0" style={{ color: "var(--text-muted)" }}>{detail.anonymousTotal} أوقية</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Daily revenue, last 30 days */}
      <div className="card p-4">
        <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>الإيرادات اليومية (آخر 30 يوماً)</p>
        {days.length === 0 ? (
          <p className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>لا توجد إيرادات في هذه الفترة</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {days.map((d) => (
              <div key={d.date} className="flex items-center justify-between text-xs" dir="ltr">
                <span style={{ color: "var(--text-main)" }}>{d.date}</span>
                <span className="font-black" style={{ color: "var(--mint-600)" }}>{d.total} أوقية</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expenses list */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          💸 سجل المصاريف ({expenses.length})
        </p>
        <button
          onClick={openCreate}
          className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
          style={{ background: "var(--mint-600)", color: "white" }}
        >
          ➕ إضافة مصروف
        </button>
      </div>

      {expenses.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>لا توجد مصاريف مسجلة بعد</p>
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => (
            <div key={e.id} className="card p-3">
              <div className="flex items-center gap-3">
                {e.proof ? (
                  <a href={`/api/files/${e.proof}`} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/files/${e.proof}`}
                      alt={e.label}
                      className="w-12 h-12 rounded-lg object-cover"
                      style={{ border: "1px solid var(--mint-100)" }}
                    />
                  </a>
                ) : (
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-lg shrink-0"
                    style={{ background: "var(--mint-50)", border: "1px solid var(--mint-100)" }}
                  >
                    🧾
                  </div>
                )}
                <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color: "var(--text-main)" }}>{e.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {new Date(e.date).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" })} — بواسطة {e.createdBy}
                    </p>
                    {e.note && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{e.note}</p>}
                  </div>
                  <p className="font-black text-sm shrink-0" style={{ color: "var(--copper-500)" }}>{e.amount} أوقية</p>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => openEdit(e)}
                  disabled={busyId === e.id}
                  className="text-xs px-3 py-1.5 rounded-lg font-bold"
                  style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                >
                  ✏️ تعديل
                </button>
                <button
                  onClick={() => deleteExpense(e.id)}
                  disabled={busyId === e.id}
                  className="text-xs px-3 py-1.5 rounded-lg font-bold"
                  style={{ background: "#fee2e2", color: "#991b1b" }}
                >
                  {busyId === e.id ? "..." : "🗑️ حذف"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/edit expense */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(ev) => { if (ev.target === ev.currentTarget) setShowForm(false); }}
        >
          <div
            className="w-full max-w-md rounded-t-3xl md:rounded-2xl overflow-y-auto"
            style={{ background: "var(--mint-50)", maxHeight: "92svh", direction: "rtl" }}
          >
            <div
              className="px-5 py-4 flex items-center justify-between sticky top-0"
              style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
            >
              <h2 className="font-black text-white text-base">
                {editingId ? "✏️ تعديل مصروف" : "➕ إضافة مصروف"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitForm} className="p-5 space-y-3">
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
                  صورة الفاتورة / الإيصال (اختياري)
                </label>
                <PhotoUpload
                  photo={form.proof || null}
                  imageUrlPrefix="/api/files"
                  variant="cover"
                  label="صورة الفاتورة"
                  placeholderIcon="🧾"
                  onUpload={(filename) => setForm((p) => ({ ...p, proof: filename }))}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
                  الوصف <span style={{ color: "var(--copper-500)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                  maxLength={100}
                  required
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
                  المبلغ (MRU) <span style={{ color: "var(--copper-500)" }}>*</span>
                </label>
                <input
                  type="number"
                  dir="ltr"
                  min={1}
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  required
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
                  التاريخ
                </label>
                <input
                  type="date"
                  dir="ltr"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
                  ملاحظة (اختياري)
                </label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                  maxLength={200}
                  className="input"
                />
              </div>

              {formError && (
                <div className="p-3 rounded-xl text-sm font-semibold" style={{ background: "#fee2e2", color: "#991b1b" }}>
                  ⚠️ {formError}
                </div>
              )}

              <button type="submit" disabled={saving} className="btn btn-primary text-sm">
                {saving ? "..." : editingId ? "💾 حفظ التعديل" : "إضافة المصروف"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
