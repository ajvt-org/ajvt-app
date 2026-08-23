"use client";

import { Suspense, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import PageLoading from "@/components/PageLoading";
import FinanceTagChips from "@/components/admin/FinanceTagChips";
import FinanceTagManager from "@/components/admin/FinanceTagManager";
import FinanceTotals from "./FinanceTotals";
import ByPaymentMethod from "./ByPaymentMethod";
import UnassignedDonations from "./UnassignedDonations";
import DailyRevenue from "./DailyRevenue";
import ExpenseList from "./ExpenseList";
import ExpenseFiltersBar from "./ExpenseFiltersBar";
import ExpenseFormDialog from "./ExpenseFormDialog";
import { exportFinance } from "./exportFinance";
import { useExpensesData } from "./useExpensesData";
import { useAdminListUrlState } from "@/hooks/useAdminListUrlState";
import { paginate, pageCount } from "@/lib/listUrlState";
import { EXPENSES_FILTER_KEYS, readExpensesFilters, writeExpensesFilters } from "./expensesFilters";
import { emptyExpenseForm, todayInputValue, PAGE_SIZE } from "./types";
import type { Expense, ExpenseForm } from "./types";

function toggleIn(set: Set<string>, key: string): Set<string> {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

function matchesExpense(expense: Expense, query: string) {
  return expense.label.includes(query) || String(expense.amount).includes(query);
}

function AdminExpensesPageInner() {
  const { role, summary, expenses, tags, activities, loading, reload } = useExpensesData();
  const { filters, page, go, goToPage } = useAdminListUrlState("/admin/expenses", {
    keys: EXPENSES_FILTER_KEYS,
    readFilters: readExpensesFilters,
    writeFilters: writeExpensesFilters,
  });

  const [reassignValue, setReassignValue] = useState<Record<string, string>>({});
  const [reassigningId, setReassigningId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [form, setForm] = useState<ExpenseForm>(emptyExpenseForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedMethods, setExpandedMethods] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  async function reassignPaymentMethod(id: string) {
    const method = reassignValue[id];
    if (!method) return;
    setReassigningId(id);
    try {
      await api.patch(`/api/admin/donations/${id}`, { paymentMethod: method });
      await reload();
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
      await reload();
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
      await reload();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <PageLoading />;

  const byMethod = Object.entries(summary?.byMethod || {}).sort((a, b) => b[1] - a[1]);
  const query = filters.q.trim();
  const shownExpenses = expenses.filter((e) => {
    if (filters.tagIds.length > 0 && !e.tags.some((t) => filters.tagIds.includes(t.id)))
      return false;
    if (query && !matchesExpense(e, query)) return false;
    if (filters.activityId && e.activity?.id !== filters.activityId) return false;
    const day = e.date.slice(0, 10);
    if (filters.dateFrom && day < filters.dateFrom) return false;
    if (filters.dateTo && day > filters.dateTo) return false;
    return true;
  });
  const isFiltered =
    filters.tagIds.length > 0 ||
    query.length > 0 ||
    !!filters.activityId ||
    !!filters.dateFrom ||
    !!filters.dateTo;
  const totalPages = pageCount(shownExpenses.length, PAGE_SIZE);
  const currentPage = Math.min(page, totalPages);
  const paginated = paginate(shownExpenses, page, PAGE_SIZE);

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
          <IconLabel name="download">تصدير</IconLabel>
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
        <FinanceTagManager
          tags={tags}
          onChanged={reload}
          onClose={() => setShowTagManager(false)}
        />
      )}

      <input
        type="text"
        placeholder="بحث بالوصف أو المبلغ..."
        value={filters.q}
        onChange={(e) => go({ ...filters, q: e.target.value })}
        className="input text-sm"
      />

      <ExpenseFiltersBar
        filters={filters}
        activities={activities}
        isFiltered={isFiltered}
        onChange={go}
        onReset={() => go({ q: "", tagIds: [], activityId: "", dateFrom: "", dateTo: "" })}
      />

      {tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
            تصفية:
          </span>
          <FinanceTagChips
            tags={tags}
            selected={filters.tagIds}
            onToggle={(id) =>
              go({
                ...filters,
                tagIds: filters.tagIds.includes(id)
                  ? filters.tagIds.filter((t) => t !== id)
                  : [...filters.tagIds, id],
              })
            }
          />
        </div>
      )}

      <ExpenseList
        expenses={paginated}
        filtered={isFiltered}
        busyId={busyId}
        onEdit={openEdit}
        onDelete={deleteExpense}
        pagination={{ page: currentPage, totalPages, onGo: goToPage }}
      />

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

export default function AdminExpensesPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminExpensesPageInner />
    </Suspense>
  );
}
