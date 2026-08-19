"use client";

import { useState } from "react";
import { counted, countedNoun } from "@/lib/arabicCount";
import { ANSWER, POINT } from "@/lib/messages";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import AdminList from "@/components/admin/AdminList";
import type { QuestionRow } from "./types";

const CHIP = "text-xs px-3 py-1.5 rounded-lg font-bold";
const MINT = { background: "var(--mint-100)", color: "var(--mint-700)" };

function matches(question: QuestionRow, needle: string) {
  return (
    question.text.toLowerCase().includes(needle) ||
    question.category.toLowerCase().includes(needle) ||
    question.answers.some((answer) => answer.text.toLowerCase().includes(needle))
  );
}

function QuestionCard({
  question,
  busy,
  onEdit,
  onToggle,
  onDelete,
}: {
  question: QuestionRow;
  busy: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="card p-3 space-y-2" style={{ opacity: question.active ? 1 : 0.6 }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
            {question.text}
          </p>
          <p
            className="text-xs mt-0.5 flex items-center gap-1 flex-wrap"
            style={{ color: "var(--text-muted)" }}
          >
            {question.category} ·<Icon name="star" size={11} />
            {counted(question.points, POINT)} · {question.correctCount}{" "}
            {countedNoun(question.correctCount, ANSWER)} صحيحة من {question.answers.length}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--mint-600)" }}>
            أُرسلت لـ {question.sentCount} · أُجيبت {question.answeredCount} · صحيحة{" "}
            {question.correctSubmissions}
          </p>
        </div>
        {!question.active && (
          <span
            className="badge shrink-0"
            style={{ background: "var(--mint-100)", color: "var(--text-muted)" }}
          >
            معطّل
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={onEdit} disabled={busy} className={CHIP} style={MINT}>
          <IconLabel name="pencil">تعديل</IconLabel>
        </button>
        <button onClick={onToggle} disabled={busy} className={CHIP} style={MINT}>
          {question.active ? (
            <IconLabel name="ban">إيقاف</IconLabel>
          ) : (
            <IconLabel name="check">تفعيل</IconLabel>
          )}
        </button>
        <button
          onClick={onDelete}
          disabled={busy}
          className={CHIP}
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          {busy ? "..." : <IconLabel name="trash">حذف</IconLabel>}
        </button>
      </div>
    </div>
  );
}

export default function QuestionList({
  questions,
  busyId,
  onCreate,
  onImport,
  onEdit,
  onToggle,
  onDelete,
}: {
  questions: QuestionRow[];
  busyId: string | null;
  onCreate: () => void;
  onImport: () => void;
  onEdit: (question: QuestionRow) => void;
  onToggle: (question: QuestionRow) => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = needle ? questions.filter((question) => matches(question, needle)) : questions;

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="quiz">
            الأسئلة ({needle ? `${shown.length}/${questions.length}` : questions.length})
          </IconLabel>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onImport}
            className="text-xs px-3 py-1.5 rounded-lg font-bold"
            style={{
              background: "white",
              color: "var(--mint-700)",
              border: "1px solid var(--mint-200)",
            }}
          >
            <IconLabel name="upload">استيراد</IconLabel>
          </button>
          <button
            onClick={onCreate}
            className="text-xs px-3 py-1.5 rounded-lg font-bold"
            style={{ background: "var(--mint-600)", color: "white" }}
          >
            <IconLabel name="plus">سؤال جديد</IconLabel>
          </button>
        </div>
      </div>

      {questions.length > 0 && (
        <input
          type="text"
          placeholder="بحث في السؤال أو التصنيف أو الأجوبة..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input text-sm"
        />
      )}

      <AdminList
        items={shown}
        getKey={(question) => question.id}
        emptyMessage="لا توجد أسئلة مسجلة بعد"
        emptyFilteredMessage="لا يوجد سؤال يطابق البحث"
        isFiltered={needle.length > 0}
        renderRow={(question) => (
          <QuestionCard
            question={question}
            busy={busyId === question.id}
            onEdit={() => onEdit(question)}
            onToggle={() => onToggle(question)}
            onDelete={() => onDelete(question.id)}
          />
        )}
      />
    </>
  );
}
