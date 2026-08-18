"use client";

import { counted, countedNoun } from "@/lib/arabicCount";
import { ANSWER, POINT } from "@/lib/messages";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import AdminList from "@/components/admin/AdminList";
import type { QuestionRow } from "./types";

const CHIP = "text-xs px-3 py-1.5 rounded-lg font-bold";
const MINT = { background: "var(--mint-100)", color: "var(--mint-700)" };

function QuestionCard({
  question,
  sending,
  busy,
  onSend,
  onEdit,
  onToggle,
  onDelete,
}: {
  question: QuestionRow;
  sending: boolean;
  busy: boolean;
  onSend: () => void;
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
        <button
          onClick={onSend}
          disabled={sending || !question.active}
          className={CHIP}
          style={{ background: "var(--mint-600)", color: "white" }}
        >
          {sending ? "..." : <IconLabel name="upload">إرسال للجميع</IconLabel>}
        </button>
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
  filtered,
  sendingId,
  busyId,
  onSend,
  onEdit,
  onToggle,
  onDelete,
}: {
  questions: QuestionRow[];
  filtered?: boolean;
  sendingId: string | null;
  busyId: string | null;
  onSend: (id: string) => void;
  onEdit: (question: QuestionRow) => void;
  onToggle: (question: QuestionRow) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <AdminList
      items={questions}
      getKey={(question) => question.id}
      renderRow={(question) => (
        <QuestionCard
          question={question}
          sending={sendingId === question.id}
          busy={busyId === question.id}
          onSend={() => onSend(question.id)}
          onEdit={() => onEdit(question)}
          onToggle={() => onToggle(question)}
          onDelete={() => onDelete(question.id)}
        />
      )}
      emptyMessage="لا توجد أسئلة مسجلة بعد"
      emptyFilteredMessage="لا توجد أسئلة مطابقة"
      isFiltered={filtered}
    />
  );
}
