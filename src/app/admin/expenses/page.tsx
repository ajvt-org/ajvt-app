"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginPathWithNext } from "@/lib/utils";
import { api, errorMessage } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import FinanceTagChips from "@/components/admin/FinanceTagChips";
import FinanceTagManager, { type FinanceTagRow } from "@/components/admin/FinanceTagManager";
import FinanceTotals from "./FinanceTotals";
import ByPaymentMethod from "./ByPaymentMethod";
import UnassignedDonations from "./UnassignedDonations";
import DailyRevenue from "./DailyRevenue";
import ExpenseList from "./ExpenseList";
import ExpenseFormDialog from "./ExpenseFormDialog";
import { exportFinance } from "./exportFinance";
import { emptyExpenseForm, todayInputValue, PAGE_SIZE } from "./types";
import type { ActivityOption, Expense, ExpenseForm, FinanceSummary } from "./types";

function toggleIn(set: Set<string>, key: string): Set<string> {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
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
  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [showTagManager, setShowTagManager] = useState(false);
  const [form, setForm] = useState<ExpenseForm>(emptyExpenseForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedMethods, setExpandedMethods] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

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
      fetch("/api/admin/activities").then((r) => (r.ok ? r.json() : null)),
    ]).then(([summaryData, expensesData, tagsData, activitiesData]) => {
      if (summaryData) setSummary(summaryData);
      if (expensesData?.expenses) setExpenses(expensesData.expenses);
      if (tagsData?.tags) setTags(tagsData.tags);
      if (activitiesData?.activities) setActivities(activitiesData.activities);
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

  function openEdit(expense: Expense) {
    setEditingId(expense.id);
    setForm({
      label: expense.label,
      amount: String(expense.amount),
      note: expense.note || "",
      date: expense.date.slice(0, 10),
      proof: expense.proof || "",
      tagIds: expense.tags.map((t) => t.id),
      activityId: expense.activity?.id || "",
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
    const amount = Number(form.amount);
    if (!Number.isInteger(amount) || amount <= 0) {
      setFormError("المبلغ يجب أن يكون رقماً صحيحاً موجباً");
      return;
    }

    setSaving(true);
    try {
      const body = {
        label: form.label.trim(),
        amount,
        note: form.note.trim() || null,
        date: form.date || undefined,
        proof: form.proof || null,
        tagIds: form.tagIds,
        activityId: form.activityId || null,
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
  const shownExpenses =
    tagFilter.length === 0
      ? expenses
      : expenses.filter((e) => e.tags.some((t) => tagFilter.includes(t.id)));
  const totalPages = Math.max(1, Math.ceil(shownExpenses.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = shownExpenses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="admin-page space-y-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="banknote">المصاريف والإيرادات</IconLabel>
        </p>
        <button
          onClick={() => exportFinance(summary, expenses)}
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

      <FinanceTotals
        revenue={summary?.totalRevenue ?? 0}
        expenses={summary?.totalExpenses ?? 0}
        net={summary?.net ?? 0}
      />

      <ByPaymentMethod
        byMethod={byMethod}
        details={summary?.byMethodDetail || {}}
        expanded={expandedMethods}
        onToggle={(method) => setExpandedMethods((prev) => toggleIn(prev, method))}
      />

      {role === "SUPER" && summary && summary.unassigned.length > 0 && (
        <UnassignedDonations
          rows={summary.unassigned}
          chosen={reassignValue}
          busyId={reassigningId}
          onChoose={(id, method) => setReassignValue((p) => ({ ...p, [id]: method }))}
          onSave={reassignPaymentMethod}
        />
      )}

      <DailyRevenue
        days={summary?.days || []}
        expanded={expandedDays}
        onToggle={(date) => setExpandedDays((prev) => toggleIn(prev, date))}
      />

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

      <ExpenseList
        expenses={paginated}
        filtered={tagFilter.length > 0}
        busyId={busyId}
        onEdit={openEdit}
        onDelete={deleteExpense}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="text-xs px-3 py-1.5 rounded-lg font-bold disabled:opacity-40 inline-flex items-center gap-1"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            <Icon name="chevronRight" size={14} />
            السابق
          </button>
          <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            صفحة {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="text-xs px-3 py-1.5 rounded-lg font-bold disabled:opacity-40 inline-flex items-center gap-1"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            التالي
            <Icon name="chevronLeft" size={14} />
          </button>
        </div>
      )}

      {showForm && (
        <ExpenseFormDialog
          form={form}
          tags={tags}
          activities={activities}
          editing={!!editingId}
          error={formError}
          saving={saving}
          onChange={(patch) => setForm((p) => ({ ...p, ...patch }))}
          onSubmit={submitForm}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
