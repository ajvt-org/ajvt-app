"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import ConfirmAction from "./ConfirmAction";
import { countedNoun, QUESTIONS } from "@/lib/arabicPlural";

export interface BankRow {
  id: string;
  name: string;
  _count: { questions: number };
}

export default function BankPicker({
  banks,
  openId,
  busy,
  error,
  onOpen,
  onCreate,
  onRename,
  onDelete,
}: {
  banks: BankRow[];
  openId: string | null;
  busy: boolean;
  error: string;
  onOpen: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<BankRow | null>(null);

  function submitNew() {
    onCreate(name);
    setName("");
    setAdding(false);
  }

  function submitRename(id: string) {
    onRename(id, name);
    setName("");
    setRenaming(null);
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="list">بنوك الأسئلة</IconLabel>
        </p>
        <button
          onClick={() => {
            setAdding(true);
            setRenaming(null);
            setName("");
          }}
          className="btn btn-primary btn-sm"
        >
          <IconLabel name="plus">بنك جديد</IconLabel>
        </button>
      </div>

      {adding && (
        <div className="flex gap-2">
          <input
            aria-label="اسم البنك"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input input-sm"
          />
          <button onClick={submitNew} disabled={busy} className="btn btn-primary btn-sm">
            حفظ
          </button>
          <button onClick={() => setAdding(false)} className="btn btn-sm">
            إلغاء
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          {error}
        </p>
      )}

      <div className="space-y-1.5">
        {banks.map((bank) => {
          const active = bank.id === openId;
          if (renaming === bank.id) {
            return (
              <div key={bank.id} className="flex gap-2">
                <input
                  aria-label="اسم البنك"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input input-sm"
                />
                <button
                  onClick={() => submitRename(bank.id)}
                  disabled={busy}
                  className="btn btn-primary btn-sm"
                >
                  حفظ
                </button>
                <button onClick={() => setRenaming(null)} className="btn btn-sm">
                  إلغاء
                </button>
              </div>
            );
          }
          return (
            <div
              key={bank.id}
              className="flex items-center gap-2 rounded-lg p-2"
              style={{
                background: active ? "var(--mint-100)" : "var(--surface-2)",
                border: `1px solid ${active ? "var(--mint-500)" : "transparent"}`,
              }}
            >
              <button onClick={() => onOpen(bank.id)} className="flex-1 text-start text-xs">
                <span className="font-bold" style={{ color: "var(--text-main)" }}>
                  {bank.name}
                </span>
                <span className="ms-2" style={{ color: "var(--text-muted)" }}>
                  {countedNoun(bank._count.questions, QUESTIONS)}
                </span>
              </button>
              <button
                aria-label={`تعديل ${bank.name}`}
                onClick={() => {
                  setRenaming(bank.id);
                  setAdding(false);
                  setName(bank.name);
                }}
                className="btn btn-icon btn-sm"
              >
                <Icon name="pencil" size={13} />
              </button>
              <button
                aria-label={`حذف ${bank.name}`}
                onClick={() => setConfirming(bank)}
                className="btn btn-icon btn-sm"
                style={{ color: "#991b1b" }}
              >
                <Icon name="trash" size={13} />
              </button>
            </div>
          );
        })}
      </div>

      {confirming && (
        <ConfirmAction
          title="حذف البنك"
          message={`سيتم حذف ${confirming.name}. هذا ممكن فقط إذا كان فارغاً.`}
          confirmLabel="حذف"
          danger
          loading={busy}
          onConfirm={() => {
            onDelete(confirming.id);
            setConfirming(null);
          }}
          onClose={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
