"use client";

import { Suspense, useState } from "react";
import Icon from "@/components/Icon";
import Notice from "@/components/Notice";
import ConfirmDialog from "@/components/ConfirmDialog";
import PageLoading from "@/components/PageLoading";
import FinanceTagManager from "@/components/admin/FinanceTagManager";
import ByAccount from "@/components/admin/ByAccount";
import FinanceTotals from "./FinanceTotals";
import ByPaymentMethod from "./ByPaymentMethod";
import UnassignedDonations from "./UnassignedDonations";
import DailyRevenue from "./DailyRevenue";
import ExpenseList from "./ExpenseList";
import ExpensesHeader from "./ExpensesHeader";
import ExpensesFilterRow from "./ExpensesFilterRow";
import ExpensesFilterChips from "./ExpensesFilterChips";
import ExpensesFilterSheet from "./ExpensesFilterSheet";
import ExpenseFormDialog from "./ExpenseFormDialog";
import { exportFinance } from "./exportFinance";
import { useExpensesData } from "./useExpensesData";
import { useExpenseEditor } from "./useExpenseEditor";
import { useExpenseActions } from "./useExpenseActions";
import { useAdminListUrlState } from "@/hooks/useAdminListUrlState";
import { paginate, pageCount } from "@/lib/listUrlState";
import {
  EXPENSES_FILTER_KEYS,
  activeExpensesFilterCount,
  expensesAreFiltered,
  matchesExpensesFilters,
  readExpensesFilters,
  writeExpensesFilters,
} from "./expensesFilters";
import { PAGE_SIZE } from "./types";
import { hasFullAccess } from "@/lib/adminRoles";
import { expensesPage } from "@/lib/texts";

function toggleIn(set: Set<string>, key: string): Set<string> {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

function AdminExpensesPageInner() {
  const { role, summary, expenses, tags, destinations, loading, reload } = useExpensesData();
  const { filters, page, go, goToPage } = useAdminListUrlState("/admin/expenses", {
    keys: EXPENSES_FILTER_KEYS,
    readFilters: readExpensesFilters,
    writeFilters: writeExpensesFilters,
  });
  const editor = useExpenseEditor({ destinations, reload });
  const actions = useExpenseActions(reload);

  const [showTagManager, setShowTagManager] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [expandedMethods, setExpandedMethods] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  if (loading) return <PageLoading />;

  const byMethod = Object.entries(summary?.byMethod || {}).sort((a, b) => b[1] - a[1]);
  const shownExpenses = expenses.filter((e) => matchesExpensesFilters(e, filters));
  const totalPages = pageCount(shownExpenses.length, PAGE_SIZE);
  const currentPage = Math.min(page, totalPages);
  const paginated = paginate(shownExpenses, currentPage, PAGE_SIZE);
  const activeCount = activeExpensesFilterCount(filters);

  return (
    <div className="admin-page space-y-5">
      {actions.error && <Notice tone="error">{actions.error}</Notice>}

      <ExpensesHeader
        count={shownExpenses.length}
        onExport={() => exportFinance(summary, expenses)}
        onToggleTags={() => setShowTagManager((v) => !v)}
        onAdd={editor.create}
      />

      <FinanceTotals
        revenue={summary?.totalRevenue ?? 0}
        expenses={summary?.totalExpenses ?? 0}
        net={summary?.net ?? 0}
      />

      {hasFullAccess(role) && summary && summary.unassigned.length > 0 && (
        <UnassignedDonations
          rows={summary.unassigned}
          chosen={actions.reassignValue}
          busyId={actions.reassigningId}
          onChoose={actions.choose}
          onSave={actions.reassign}
        />
      )}

      {showTagManager && (
        <FinanceTagManager
          tags={tags}
          onChanged={reload}
          onClose={() => setShowTagManager(false)}
        />
      )}

      <input
        type="text"
        placeholder={expensesPage.searchPlaceholder}
        value={filters.q}
        onChange={(e) => go({ ...filters, q: e.target.value })}
        className="input text-sm"
      />

      <ExpensesFilterRow filters={filters} destinations={destinations} tags={tags} onChange={go} />

      <div className="flex items-center gap-2">
        <button
          onClick={() => setFiltering(true)}
          className="text-xs px-3 py-2 rounded-lg font-bold shrink-0 flex items-center gap-1.5"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          <Icon name="filter" size={14} />
          {expensesPage.filter}
          {activeCount > 0 && <span className="badge badge-numeral">{activeCount}</span>}
        </button>
      </div>

      <ExpensesFilterChips
        filters={filters}
        destinations={destinations}
        tags={tags}
        resultCount={shownExpenses.length}
        onChange={go}
      />

      <ExpenseList
        expenses={paginated}
        filtered={expensesAreFiltered(filters)}
        busyId={actions.busyId}
        onEdit={editor.edit}
        onDelete={actions.ask}
        pagination={{ page: currentPage, totalPages, onGo: goToPage }}
      />

      <ByPaymentMethod
        byMethod={byMethod}
        details={summary?.byMethodDetail || {}}
        expanded={expandedMethods}
        onToggle={(method) => setExpandedMethods((prev) => toggleIn(prev, method))}
      />

      <ByAccount />

      <DailyRevenue
        days={summary?.days || []}
        expanded={expandedDays}
        onToggle={(date) => setExpandedDays((prev) => toggleIn(prev, date))}
      />

      {filtering && (
        <ExpensesFilterSheet
          filters={filters}
          destinations={destinations}
          tags={tags}
          resultCount={shownExpenses.length}
          onChange={go}
          onClose={() => setFiltering(false)}
        />
      )}

      {editor.open && (
        <ExpenseFormDialog
          form={editor.form}
          tags={tags}
          destinations={destinations}
          editing={!!editor.editingId}
          expenseId={editor.editingId}
          held={editor.held}
          error={editor.error}
          saving={editor.saving}
          onChange={editor.patch}
          onSubmit={editor.submit}
          onClose={editor.close}
        />
      )}

      {actions.asking && (
        <ConfirmDialog
          title={expensesPage.confirmDeleteTitle}
          message={expensesPage.confirmDelete}
          confirmLabel={expensesPage.delete}
          danger
          loading={actions.busyId === actions.asking}
          onConfirm={() => actions.destroy(actions.asking!)}
          onClose={() => actions.ask(null)}
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
