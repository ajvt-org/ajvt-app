"use client";

import { useState } from "react";
import { counted } from "@/lib/arabicCount";
import { POINT } from "@/lib/messages";
import { quizQuestionList as texts } from "@/lib/texts";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import AdminList from "@/components/admin/AdminList";
import type { MoveDirection } from "@/lib/quizQuestionOrder";
import type { QuestionRow } from "./types";

const ACTION = "w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30";
const MINT = { background: "var(--mint-50)", color: "var(--mint-700)" };
const RED = { background: "#fee2e2", color: "#991b1b" };
const MARK = "badge text-xs";
const MARK_STYLE = { background: "var(--mint-50)", color: "var(--mint-700)" };

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
  canMoveUp,
  canMoveDown,
  onEdit,
  onToggle,
  onDelete,
  onMove,
}: {
  question: QuestionRow;
  busy: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onMove: (direction: MoveDirection) => void;
}) {
  const correct = question.answers.filter((answer) => answer.isCorrect);

  return (
    <div className="card p-3 space-y-2" style={{ opacity: question.active ? 1 : 0.6 }}>
      <bdi className="block font-bold text-sm" style={{ color: "var(--text-main)" }}>
        {question.text}
      </bdi>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className={MARK} style={MARK_STYLE}>
          {question.category}
        </span>
        <span className={MARK} style={MARK_STYLE}>
          <Icon name="star" size={11} />
          {counted(question.points, POINT)}
        </span>
        <span
          className={MARK}
          style={MARK_STYLE}
          title={texts.answersMark}
          aria-label={texts.answersMark}
        >
          <Icon name="list" size={11} />
          {texts.answerShape(question.correctCount, question.answers.length)}
        </span>
        {!question.active && (
          <span
            className={MARK}
            style={{ background: "var(--mint-100)", color: "var(--text-muted)" }}
          >
            {texts.disabled}
          </span>
        )}
      </div>

      {correct.length > 0 ? (
        <p className="flex items-center gap-1.5 text-xs" style={{ color: "var(--mint-700)" }}>
          <Icon name="check" size={12} className="shrink-0" />
          <bdi className="min-w-0 truncate">{correct.map((answer) => answer.text).join(" · ")}</bdi>
        </p>
      ) : (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          {texts.noCorrect}
        </p>
      )}

      {question.sentCount > 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.play(question.sentCount, question.answeredCount, question.correctSubmissions)}
        </p>
      )}

      <div className="flex items-center gap-1">
        <button
          aria-label={texts.moveUp}
          onClick={() => onMove("up")}
          disabled={busy || !canMoveUp}
          className={ACTION}
          style={MINT}
        >
          <Icon name="chevronUp" size={15} />
        </button>
        <button
          aria-label={texts.moveDown}
          onClick={() => onMove("down")}
          disabled={busy || !canMoveDown}
          className={ACTION}
          style={MINT}
        >
          <Icon name="chevronDown" size={15} />
        </button>

        <button
          aria-label={texts.edit}
          onClick={onEdit}
          disabled={busy}
          className={`${ACTION} ms-auto`}
          style={MINT}
        >
          <Icon name="pencil" size={15} />
        </button>
        <button
          aria-label={question.active ? texts.disable : texts.enable}
          onClick={onToggle}
          disabled={busy}
          className={ACTION}
          style={MINT}
        >
          <Icon name={question.active ? "ban" : "check"} size={15} />
        </button>
        <button
          aria-label={texts.remove}
          onClick={onDelete}
          disabled={busy}
          className={ACTION}
          style={RED}
        >
          <Icon name="trash" size={15} />
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
  onMove,
}: {
  questions: QuestionRow[];
  busyId: string | null;
  onCreate: () => void;
  onImport: () => void;
  onEdit: (question: QuestionRow) => void;
  onToggle: (question: QuestionRow) => void;
  onDelete: (id: string) => void;
  onMove: (question: QuestionRow, direction: MoveDirection) => void;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = needle ? questions.filter((question) => matches(question, needle)) : questions;
  const last = shown.length - 1;
  const position = new Map(shown.map((question, index) => [question.id, index]));

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="quiz">
            {needle
              ? texts.headingFiltered(shown.length, questions.length)
              : texts.heading(questions.length)}
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
            <IconLabel name="upload">{texts.import}</IconLabel>
          </button>
          <button
            onClick={onCreate}
            className="text-xs px-3 py-1.5 rounded-lg font-bold"
            style={{ background: "var(--mint-600)", color: "white" }}
          >
            <IconLabel name="plus">{texts.create}</IconLabel>
          </button>
        </div>
      </div>

      {questions.length > 0 && (
        <input
          type="text"
          placeholder={texts.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input text-sm"
        />
      )}

      <AdminList
        items={shown}
        getKey={(question) => question.id}
        emptyMessage={texts.empty}
        emptyFilteredMessage={texts.emptyFiltered}
        isFiltered={needle.length > 0}
        renderRow={(question) => (
          <QuestionCard
            question={question}
            busy={busyId === question.id}
            canMoveUp={!needle && (position.get(question.id) ?? 0) > 0}
            canMoveDown={!needle && (position.get(question.id) ?? last) < last}
            onEdit={() => onEdit(question)}
            onToggle={() => onToggle(question)}
            onDelete={() => onDelete(question.id)}
            onMove={(direction) => onMove(question, direction)}
          />
        )}
      />
    </>
  );
}
