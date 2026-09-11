"use client";

import { useState } from "react";
import RecordHistory from "@/components/admin/RecordHistory";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import Money from "@/components/Money";
import FinanceTagChips from "@/components/admin/FinanceTagChips";
import AdminList, { type AdminListPagination } from "@/components/admin/AdminList";
import { toThumbUrl } from "@/lib/utils";
import { formatDateTime } from "@/lib/clubTime";
import { expenseList as texts, expenseReceipts } from "@/lib/texts";
import ExpenseReceiptsDialog from "./ExpenseReceiptsDialog";
import type { Expense } from "./types";

const THUMB = "w-12 h-12 rounded-lg object-cover";

function Scan({ filename, alt }: { filename: string; alt: string }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={toThumbUrl(`/api/files/${filename}`)}
      alt={alt}
      width={48}
      height={48}
      loading="lazy"
      decoding="async"
      className={THUMB}
      style={{ border: "1px solid var(--mint-100)" }}
    />
  );
}

function Count({ of }: { of: number }) {
  return (
    <span
      className="absolute -top-1 -left-1 text-xs font-black rounded-full px-1.5"
      style={{ background: "var(--mint-700)", color: "white" }}
    >
      {of}
    </span>
  );
}

function Thumb({ expense }: { expense: Expense }) {
  const [showReceipts, setShowReceipts] = useState(false);
  const proofs = expense.proofs.map((row) => row.filename);
  const first = proofs[0];

  if (!first) {
    return (
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "var(--mint-50)", border: "1px solid var(--mint-100)" }}
      >
        <Icon name="receipt" size={16} />
      </div>
    );
  }

  if (proofs.length === 1) {
    return (
      <a
        href={`/api/files/${first}`}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0"
      >
        <Scan filename={first} alt={expense.label} />
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowReceipts(true)}
        aria-label={expenseReceipts.title}
        className="shrink-0 relative"
      >
        <Scan filename={first} alt={expense.label} />
        <Count of={proofs.length} />
      </button>

      {showReceipts && (
        <ExpenseReceiptsDialog proofs={proofs} onClose={() => setShowReceipts(false)} />
      )}
    </>
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
            <p
              className="font-bold text-sm line-clamp-2"
              style={{ color: "var(--text-main)", overflowWrap: "anywhere" }}
            >
              {expense.label}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              <bdi dir="ltr">{formatDateTime(expense.date)}</bdi>{" "}
              {texts.recordedBy(expense.createdBy)}
            </p>
            {expense.note && (
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {expense.note}
              </p>
            )}
            {expense.allocations
              .filter((share) => share.activity || share.competition)
              .map((share) => (
                <p key={share.id} className="text-xs mt-0.5" style={{ color: "var(--mint-600)" }}>
                  <IconLabel name={share.activity ? "trophy" : "quiz"} size={11}>
                    {share.activity ? share.activity.title : share.competition!.name}
                    {expense.allocations.length > 1 && (
                      <>
                        {" "}
                        <Money value={share.amount} />
                      </>
                    )}
                  </IconLabel>
                </p>
              ))}
            {expense.tags.length > 0 && (
              <div className="mt-1.5">
                <FinanceTagChips tags={expense.tags} />
              </div>
            )}
          </div>
          <p
            className="font-black text-sm shrink-0 self-start"
            style={{ color: "var(--copper-500)" }}
          >
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
          <IconLabel name="pencil">{texts.edit}</IconLabel>
        </button>
        <button
          onClick={onDelete}
          disabled={busy}
          className="text-xs px-3 py-1.5 rounded-lg font-bold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          {busy ? "..." : <IconLabel name="trash">{texts.delete}</IconLabel>}
        </button>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-xs px-3 py-1.5 rounded-lg font-bold"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          <IconLabel name="list">{texts.history}</IconLabel>
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
      emptyMessage={texts.empty}
      emptyFilteredMessage={texts.emptyFiltered}
      isFiltered={filtered}
      pagination={pagination}
    />
  );
}
