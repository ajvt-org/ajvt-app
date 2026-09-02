"use client";

import { useState } from "react";
import RecordHistory from "@/components/admin/RecordHistory";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import Money from "@/components/Money";
import FinanceTagChips from "@/components/admin/FinanceTagChips";
import AdminList, { type AdminListPagination } from "@/components/admin/AdminList";
import { formatDate, toThumbUrl } from "@/lib/utils";
import type { Expense } from "./types";

function Thumb({ expense }: { expense: Expense }) {
  if (!expense.proof) {
    return (
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "var(--mint-50)", border: "1px solid var(--mint-100)" }}
      >
        <Icon name="receipt" size={16} />
      </div>
    );
  }

  return (
    <a
      href={`/api/files/${expense.proof}`}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={toThumbUrl(`/api/files/${expense.proof}`)}
        alt={expense.label}
        width={48}
        height={48}
        loading="lazy"
        decoding="async"
        className="w-12 h-12 rounded-lg object-cover"
        style={{ border: "1px solid var(--mint-100)" }}
      />
    </a>
  );
}

function Row({
  expense,
  busy,
  onEdit,
  onDelete,
}: {
  expense: Expense;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="card p-3">
      <div className="flex items-center gap-3">
        <Thumb expense={expense} />
        <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-sm truncate" style={{ color: "var(--text-main)" }}>
              {expense.label}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {formatDate(expense.date)} بواسطة {expense.createdBy}
            </p>
            {expense.note && (
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {expense.note}
              </p>
            )}
            {expense.activity && (
              <p className="text-xs mt-0.5" style={{ color: "var(--mint-600)" }}>
                <IconLabel name="trophy" size={11}>
                  {expense.activity.title}
                </IconLabel>
              </p>
            )}
            {expense.tags.length > 0 && (
              <div className="mt-1.5">
                <FinanceTagChips tags={expense.tags} />
              </div>
            )}
          </div>
          <p className="font-black text-sm shrink-0" style={{ color: "var(--copper-500)" }}>
            <Money value={expense.amount} />
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <button
          onClick={onEdit}
          disabled={busy}
          className="text-xs px-3 py-1.5 rounded-lg font-bold"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          <IconLabel name="pencil">تعديل</IconLabel>
        </button>
        <button
          onClick={onDelete}
          disabled={busy}
          className="text-xs px-3 py-1.5 rounded-lg font-bold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          {busy ? "..." : <IconLabel name="trash">حذف</IconLabel>}
        </button>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-xs px-3 py-1.5 rounded-lg font-bold"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          <IconLabel name="list">السجل</IconLabel>
        </button>
      </div>

      {showHistory && <RecordHistory targetType="Expense" targetId={expense.id} />}
    </div>
  );
}

export default function ExpenseList({
  expenses,
  filtered,
  busyId,
  onEdit,
  onDelete,
  pagination,
}: {
  expenses: Expense[];
  filtered: boolean;
  busyId: string | null;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  pagination?: AdminListPagination;
}) {
  return (
    <AdminList
      items={expenses}
      getKey={(expense) => expense.id}
      renderRow={(expense) => (
        <Row
          expense={expense}
          busy={busyId === expense.id}
          onEdit={() => onEdit(expense)}
          onDelete={() => onDelete(expense.id)}
        />
      )}
      emptyMessage="لا توجد مصاريف مسجلة بعد"
      emptyFilteredMessage="لا توجد نتائج مطابقة"
      isFiltered={filtered}
      pagination={pagination}
    />
  );
}
