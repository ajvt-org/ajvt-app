"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatDayKey, loginPathWithNext, toThumbUrl } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/lib/donations";
import PhotoUpload from "@/components/PhotoUpload";
import { api, errorMessage } from "@/lib/api";
import DialogClose from "@/components/DialogClose";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import FinanceTagChips from "@/components/admin/FinanceTagChips";
import FinanceTagManager, { type FinanceTagRow } from "@/components/admin/FinanceTagManager";

interface Expense {
  id: string;
  label: string;
  amount: number;
  note: string | null;
  proof: string | null;
  date: string;
  createdBy: string;
  tags: { id: string; name: string }[];
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

interface UnassignedDonation {
  id: string;
  name: string;
  amount: number;
}

interface DayRecord {
  date: string;
  time: string;
  name: string;
  amount: number;
  method: string;
  kind: "انتساب" | "دعم";
}

interface FinanceSummary {
  byMethod: Record<string, number>;
  byMethodDetail: Record<string, MethodDetail>;
  unassigned: UnassignedDonation[];
  days: { date: string; total: number; byMethod: Record<string, number>; records: DayRecord[] }[];
  allRecords: DayRecord[];
  totalRevenue: number;
  totalExpenses: number;
  net: number;
}

const emptyExpenseForm = {
  label: "",
  amount: "",
  note: "",
  date: "",
  proof: "",
  tagIds: [] as string[],
};
const PAGE_SIZE = 30;

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminExpensesPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [reassignValue, setReassignValue] = useState<Record<string, string>>({});
  const [reassigningId, setReassigningId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tags, setTags] = useState<FinanceTagRow[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [showTagManager, setShowTagManager] = useState(false);
  const [form, setForm] = useState(emptyExpenseForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedMethods, setExpandedMethods] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  function toggleMethod(method: string) {
    setExpandedMethods((prev) => {
      const next = new Set(prev);
      if (next.has(method)) next.delete(method);
      else next.add(method);
      return next;
    });
  }

  function toggleDay(date: string) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  function groupDayRecords(records: DayRecord[]) {
    const groups: Record<string, Record<string, DayRecord[]>> = { دعم: {}, انتساب: {} };
    for (const r of records) {
      groups[r.kind][r.method] = groups[r.kind][r.method] || [];
      groups[r.kind][r.method].push(r);
    }
    return groups;
  }

  function exportCSV() {
    const headers = ["التاريخ", "النوع", "الاسم / الوصف", "التصنيف", "طريقة الدفع", "المبلغ"];
    const revenueRows = (summary?.allRecords || []).map((r) => [
      r.date,
      "إيراد",
      r.name,
      r.kind,
      r.method,
      r.amount,
    ]);
    const expenseRows = expenses.map((e) => [
      e.date.slice(0, 10),
      "مصروف",
      e.label,
      "مصروف",
      "-",
      e.amount,
    ]);
    const rows = [...revenueRows, ...expenseRows].sort((a, b) =>
      String(b[0]).localeCompare(String(a[0])),
    );
    const csv =
      "﻿" +
      [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function load() {
    return Promise.all([
      fetch("/api/admin/finance/summary").then((r) => {
        if (r.status === 401) {
          router.push(loginPathWithNext("/admin/login"));
          return null;
        }
        return r.ok ? r.json() : null;
      }),
      fetch("/api/admin/expenses").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/admin/finance-tags").then((r) => (r.ok ? r.json() : null)),
    ]).then(([summaryData, expensesData, tagsData]) => {
      if (summaryData) setSummary(summaryData);
      if (expensesData?.expenses) setExpenses(expensesData.expenses);
      if (tagsData?.tags) setTags(tagsData.tags);
    });
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
    fetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.role) setRole(data.role);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reassignPaymentMethod(id: string) {
    const method = reassignValue[id];
    if (!method) return;
    setReassigningId(id);
    try {
      await api.patch(`/api/admin/donations/${id}`, { paymentMethod: method });
      await load();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setReassigningId(null);
    }
  }

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
      tagIds: e.tags.map((t) => t.id),
    });
    setFormError("");
    setShowForm(true);
  }

  async function submitForm(ev: React.SubmitEvent<HTMLFormElement>) {
    ev.preventDefault();
    setFormError("");
    if (!form.label.trim()) {
      setFormError("الوصف مطلوب");
      return;
    }
    const n = Number(form.amount);
    if (!Number.isInteger(n) || n <= 0) {
      setFormError("المبلغ يجب أن يكون رقماً صحيحاً موجباً");
      return;
    }

    setSaving(true);
    try {
      const body = {
        label: form.label.trim(),
        amount: n,
        note: form.note.trim() || null,
        date: form.date || undefined,
        proof: form.proof || null,
        tagIds: form.tagIds,
      };
      if (editingId) await api.patch(`/api/admin/expenses/${editingId}`, body);
      else await api.post("/api/admin/expenses", body);
      setShowForm(false);
      await load();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا المصروف؟")) return;
    setBusyId(id);
    try {
      await api.del(`/api/admin/expenses/${id}`);
      await load();
    } catch (e) {
      alert(errorMessage(e));
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
  const shownExpenses =
    tagFilter.length === 0
      ? expenses
      : expenses.filter((e) => e.tags.some((t) => tagFilter.includes(t.id)));
  const totalExpensePages = Math.max(1, Math.ceil(shownExpenses.length / PAGE_SIZE));
  const currentExpensePage = Math.min(page, totalExpensePages);
  const paginatedExpenses = shownExpenses.slice(
    (currentExpensePage - 1) * PAGE_SIZE,
    currentExpensePage * PAGE_SIZE,
  );

  return (
    <div className="admin-page space-y-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="banknote">المصاريف والإيرادات</IconLabel>
        </p>
        <button
          onClick={exportCSV}
          className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0"
          style={{
            background: "white",
            color: "var(--mint-700)",
            border: "1px solid var(--mint-100)",
          }}
        >
          <IconLabel name="download">تصدير CSV</IconLabel>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="card p-3 text-center">
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            <IconLabel name="wallet">الإيرادات</IconLabel>
          </p>
          <p className="text-base font-black" style={{ color: "var(--mint-600)" }}>
            {summary?.totalRevenue ?? 0}
          </p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            <IconLabel name="banknote">المصاريف</IconLabel>
          </p>
          <p className="text-base font-black" style={{ color: "var(--copper-500)" }}>
            {summary?.totalExpenses ?? 0}
          </p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            <IconLabel name="chart">الصافي</IconLabel>
          </p>
          <p className="text-base font-black" style={{ color: "var(--text-main)" }}>
            {summary?.net ?? 0}
          </p>
        </div>
      </div>

      <div className="card p-4">
        <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>
          حسب طريقة الدفع (كل الإيرادات)
        </p>
        {byMethod.length === 0 ? (
          <p className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>
            لا توجد بيانات بعد
          </p>
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
                      <Icon name={expanded ? "chevronDown" : "chevronLeft"} size={14} />
                      <span style={{ color: "var(--text-main)" }} className="font-bold truncate">
                        {method}
                      </span>
                    </span>
                    <span className="font-black shrink-0" style={{ color: "var(--mint-600)" }}>
                      {total} أوقية
                    </span>
                  </button>

                  {expanded && detail && (
                    <div
                      className="mt-2 mr-4 space-y-2.5 p-2.5 rounded-lg"
                      style={{ background: "var(--mint-50)" }}
                    >
                      <div>
                        <p className="text-xs font-bold mb-1" style={{ color: "var(--text-main)" }}>
                          1- انتساب
                        </p>
                        {detail.intisab.length === 0 ? (
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            لا يوجد
                          </p>
                        ) : (
                          <div className="space-y-0.5">
                            {detail.intisab.map((entry, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="truncate" style={{ color: "var(--text-main)" }}>
                                  {i + 1}. {entry.name}
                                </span>
                                <span
                                  className="font-bold shrink-0"
                                  style={{ color: "var(--mint-600)" }}
                                >
                                  {entry.amount} أوقية
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold mb-1" style={{ color: "var(--text-main)" }}>
                          2- دعم
                        </p>
                        {detail.daem.length === 0 ? (
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            لا يوجد
                          </p>
                        ) : (
                          <div className="space-y-0.5">
                            {detail.daem.map((entry, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="truncate" style={{ color: "var(--text-main)" }}>
                                  {i + 1}. {entry.name}
                                </span>
                                <span
                                  className="font-bold shrink-0"
                                  style={{ color: "var(--mint-600)" }}
                                >
                                  {entry.amount} أوقية
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {detail.anonymousTotal > 0 && (
                        <div
                          className="flex items-center justify-between text-xs pt-1.5"
                          style={{ borderTop: "1px solid var(--mint-100)" }}
                        >
                          <span style={{ color: "var(--text-muted)" }}>🤍 فاعل خير</span>
                          <span
                            className="font-bold shrink-0"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {detail.anonymousTotal} أوقية
                          </span>
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

      {role === "SUPER" && summary && summary.unassigned.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>
            <IconLabel name="card">
              مبالغ بلا طريقة دفع محددة ({summary.unassigned.length})
            </IconLabel>
          </p>
          <div className="space-y-2">
            {summary.unassigned.map((u) => (
              <div key={u.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate" style={{ color: "var(--text-main)" }}>
                    {u.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--mint-600)" }}>
                    {u.amount} أوقية
                  </p>
                </div>
                <select
                  value={reassignValue[u.id] || ""}
                  onChange={(e) => setReassignValue((p) => ({ ...p, [u.id]: e.target.value }))}
                  className="input text-xs"
                  style={{ width: "auto" }}
                >
                  <option value="">اختر طريقة الدفع...</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => reassignPaymentMethod(u.id)}
                  disabled={!reassignValue[u.id] || reassigningId === u.id}
                  className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
                  style={{ background: "var(--mint-600)", color: "white" }}
                >
                  {reassigningId === u.id ? "..." : "حفظ"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4">
        <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>
          الإيرادات اليومية (آخر 30 يوماً)
        </p>
        {days.length === 0 ? (
          <p className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>
            لا توجد إيرادات في هذه الفترة
          </p>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {days.map((d) => {
              const expandedDay = expandedDays.has(d.date);
              return (
                <div key={d.date}>
                  <button
                    type="button"
                    onClick={() => toggleDay(d.date)}
                    className="w-full flex items-center justify-between text-xs"
                    dir="ltr"
                  >
                    <span className="flex items-center gap-1.5">
                      <Icon name={expandedDay ? "chevronDown" : "chevronLeft"} size={14} />
                      <span style={{ color: "var(--text-main)" }}>{formatDayKey(d.date)}</span>
                    </span>
                    <span className="font-black" style={{ color: "var(--mint-600)" }}>
                      {d.total} أوقية
                    </span>
                  </button>

                  {expandedDay && (
                    <div
                      className="mt-1.5 mr-4 space-y-3 p-2.5 rounded-lg"
                      style={{ background: "var(--mint-50)" }}
                    >
                      {d.records.length === 0 ? (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          لا توجد تفاصيل
                        </p>
                      ) : (
                        (["دعم", "انتساب"] as const).map((kind) => {
                          const methods = groupDayRecords(d.records)[kind];
                          const methodKeys = Object.keys(methods);
                          if (methodKeys.length === 0) return null;
                          return (
                            <div key={kind}>
                              <p
                                className="text-xs font-bold mb-1.5"
                                style={{ color: "var(--text-main)" }}
                              >
                                {kind === "دعم" ? (
                                  <IconLabel name="heart" size={11}>
                                    دعم
                                  </IconLabel>
                                ) : (
                                  <IconLabel name="idCard" size={11}>
                                    انتساب
                                  </IconLabel>
                                )}
                              </p>
                              <div className="space-y-2 mr-2">
                                {methodKeys.map((method) => {
                                  const items = methods[method];
                                  const subtotal = items.reduce((sum, r) => sum + r.amount, 0);
                                  return (
                                    <div key={method}>
                                      <div className="flex items-center justify-between text-xs">
                                        <span
                                          className="font-bold"
                                          style={{ color: "var(--mint-700)" }}
                                        >
                                          {method}
                                        </span>
                                        <span
                                          className="font-bold"
                                          style={{ color: "var(--mint-600)" }}
                                        >
                                          {subtotal} أوقية
                                        </span>
                                      </div>
                                      <div className="mr-2 mt-0.5 space-y-0.5">
                                        {items.map((r, i) => (
                                          <div
                                            key={i}
                                            className="flex items-center justify-between text-xs"
                                          >
                                            <span
                                              className="truncate"
                                              style={{ color: "var(--text-muted)" }}
                                            >
                                              {r.name}
                                            </span>
                                            <span
                                              className="shrink-0"
                                              style={{ color: "var(--text-muted)" }}
                                            >
                                              {r.amount} أوقية
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="banknote">سجل المصاريف ({shownExpenses.length})</IconLabel>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowTagManager((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-lg font-bold"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            <IconLabel name="tag">التصنيفات</IconLabel>
          </button>
          <button
            onClick={openCreate}
            className="text-xs px-3 py-1.5 rounded-lg font-bold"
            style={{ background: "var(--mint-600)", color: "white" }}
          >
            <IconLabel name="plus">إضافة مصروف</IconLabel>
          </button>
        </div>
      </div>

      {showTagManager && (
        <FinanceTagManager tags={tags} onChanged={load} onClose={() => setShowTagManager(false)} />
      )}

      {tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
            تصفية:
          </span>
          <FinanceTagChips
            tags={tags}
            selected={tagFilter}
            onToggle={(id) =>
              setTagFilter((prev) =>
                prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
              )
            }
          />
          {tagFilter.length > 0 && (
            <button
              onClick={() => setTagFilter([])}
              className="text-xs font-bold"
              style={{ color: "var(--mint-700)" }}
            >
              الكل
            </button>
          )}
        </div>
      )}

      {shownExpenses.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
          {tagFilter.length > 0 ? "لا توجد مصاريف بهذا التصنيف" : "لا توجد مصاريف مسجلة بعد"}
        </p>
      ) : (
        <div className="space-y-2">
          {paginatedExpenses.map((e) => (
            <div key={e.id} className="card p-3">
              <div className="flex items-center gap-3">
                {e.proof ? (
                  <a
                    href={`/api/files/${e.proof}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={toThumbUrl(`/api/files/${e.proof}`)}
                      alt={e.label}
                      width={48}
                      height={48}
                      loading="lazy"
                      decoding="async"
                      className="w-12 h-12 rounded-lg object-cover"
                      style={{ border: "1px solid var(--mint-100)" }}
                    />
                  </a>
                ) : (
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-lg shrink-0"
                    style={{ background: "var(--mint-50)", border: "1px solid var(--mint-100)" }}
                  >
                    <Icon name="receipt" size={16} className="icon-inline" />
                  </div>
                )}
                <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color: "var(--text-main)" }}>
                      {e.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {formatDate(e.date)} — بواسطة {e.createdBy}
                    </p>
                    {e.note && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {e.note}
                      </p>
                    )}
                    {e.tags.length > 0 && (
                      <div className="mt-1.5">
                        <FinanceTagChips tags={e.tags} />
                      </div>
                    )}
                  </div>
                  <p className="font-black text-sm shrink-0" style={{ color: "var(--copper-500)" }}>
                    {e.amount} أوقية
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => openEdit(e)}
                  disabled={busyId === e.id}
                  className="text-xs px-3 py-1.5 rounded-lg font-bold"
                  style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                >
                  <IconLabel name="pencil">تعديل</IconLabel>
                </button>
                <button
                  onClick={() => deleteExpense(e.id)}
                  disabled={busyId === e.id}
                  className="text-xs px-3 py-1.5 rounded-lg font-bold"
                  style={{ background: "#fee2e2", color: "#991b1b" }}
                >
                  {busyId === e.id ? "..." : <IconLabel name="trash">حذف</IconLabel>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalExpensePages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            onClick={() => setPage(currentExpensePage - 1)}
            disabled={currentExpensePage <= 1}
            className="text-xs px-3 py-1.5 rounded-lg font-bold disabled:opacity-40 inline-flex items-center gap-1"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            <Icon name="chevronRight" size={14} />
            السابق
          </button>
          <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            صفحة {currentExpensePage} / {totalExpensePages}
          </span>
          <button
            onClick={() => setPage(currentExpensePage + 1)}
            disabled={currentExpensePage >= totalExpensePages}
            className="text-xs px-3 py-1.5 rounded-lg font-bold disabled:opacity-40 inline-flex items-center gap-1"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            التالي
            <Icon name="chevronLeft" size={14} />
          </button>
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(ev) => {
            if (ev.target === ev.currentTarget) setShowForm(false);
          }}
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
                {editingId ? (
                  <IconLabel name="pencil">تعديل مصروف</IconLabel>
                ) : (
                  <IconLabel name="plus">إضافة مصروف</IconLabel>
                )}
              </h2>
              <DialogClose onClick={() => setShowForm(false)} />
            </div>

            <form onSubmit={submitForm} className="p-5 space-y-3">
              <div>
                <p className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
                  صورة الفاتورة / الإيصال (اختياري)
                </p>
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
                <label
                  className="block text-sm font-bold mb-1.5"
                  style={{ color: "var(--text-main)" }}
                  htmlFor="expense-field-1"
                >
                  الوصف <span style={{ color: "var(--copper-500)" }}>*</span>
                </label>
                <input
                  id="expense-field-1"
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                  maxLength={100}
                  required
                  className="input"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-bold mb-1.5"
                  style={{ color: "var(--text-main)" }}
                  htmlFor="expense-field-2"
                >
                  المبلغ (MRU) <span style={{ color: "var(--copper-500)" }}>*</span>
                </label>
                <input
                  id="expense-field-2"
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
                <label
                  className="block text-sm font-bold mb-1.5"
                  style={{ color: "var(--text-main)" }}
                  htmlFor="expense-field-3"
                >
                  التاريخ
                </label>
                <input
                  id="expense-field-3"
                  type="date"
                  dir="ltr"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-bold mb-1.5"
                  style={{ color: "var(--text-main)" }}
                  htmlFor="expense-field-4"
                >
                  ملاحظة (اختياري)
                </label>
                <input
                  id="expense-field-4"
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                  maxLength={200}
                  className="input"
                />
              </div>
              <div>
                <p className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
                  التصنيفات
                </p>
                <FinanceTagChips
                  tags={tags}
                  selected={form.tagIds}
                  onToggle={(id) =>
                    setForm((p) => ({
                      ...p,
                      tagIds: p.tagIds.includes(id)
                        ? p.tagIds.filter((t) => t !== id)
                        : [...p.tagIds, id],
                    }))
                  }
                  empty="لا توجد تصنيفات بعد — أضفها من زر التصنيفات"
                />
              </div>

              {formError && (
                <div
                  className="p-3 rounded-xl text-sm font-semibold"
                  style={{ background: "#fee2e2", color: "#991b1b" }}
                >
                  <Icon name="warning" size={13} className="icon-inline" /> {formError}
                </div>
              )}

              <button type="submit" disabled={saving} className="btn btn-primary text-sm">
                {saving ? (
                  "..."
                ) : editingId ? (
                  <IconLabel name="save">حفظ التعديل</IconLabel>
                ) : (
                  "إضافة المصروف"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
