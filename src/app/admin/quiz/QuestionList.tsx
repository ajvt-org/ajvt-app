"use client";

import { useState } from "react";
import { counted } from "@/lib/arabicCount";
import { countedNoun, CORRECT_ANSWERS, ANSWERS } from "@/lib/arabicPlural";
import { POINT } from "@/lib/messages";
import { quizQuestionList as texts } from "@/lib/texts";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import AdminList from "@/components/admin/AdminList";
import type { MoveDirection } from "@/lib/quizQuestionOrder";
import type { QuestionRow } from "./types";

const CHIP = "text-xs px-3 py-1.5 rounded-lg font-bold";
const MINT = { background: "var(--mint-100)", color: "var(--mint-700)" };
const ARROW = "w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30";
const ARROW_STYLE = { background: "var(--mint-50)", color: "var(--mint-700)" };

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
            {counted(question.points, POINT)} ·{" "}
            {countedNoun(question.correctCount, CORRECT_ANSWERS)} {texts.outOf}{" "}
            {countedNoun(question.answers.length, ANSWERS)}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--mint-600)" }}>
            {texts.play(question.sentCount, question.answeredCount, question.correctSubmissions)}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!question.active && (
            <span
              className="badge"
              style={{ background: "var(--mint-100)", color: "var(--text-muted)" }}
            >
              {texts.disabled}
            </span>
          )}
          <button
            aria-label={texts.moveUp}
            onClick={() => onMove("up")}
            disabled={busy || !canMoveUp}
            className={ARROW}
            style={ARROW_STYLE}
          >
            <Icon name="chevronUp" size={15} />
          </button>
          <button
            aria-label={texts.moveDown}
            onClick={() => onMove("down")}
            disabled={busy || !canMoveDown}
            className={ARROW}
            style={ARROW_STYLE}
          >
            <Icon name="chevronDown" size={15} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={onEdit} disabled={busy} className={CHIP} style={MINT}>
          <IconLabel name="pencil">{texts.edit}</IconLabel>
        </button>
        <button onClick={onToggle} disabled={busy} className={CHIP} style={MINT}>
          {question.active ? (
            <IconLabel name="ban">{texts.disable}</IconLabel>
          ) : (
            <IconLabel name="check">{texts.enable}</IconLabel>
          )}
        </button>
        <button
          onClick={onDelete}
          disabled={busy}
          className={CHIP}
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          {busy ? "..." : <IconLabel name="trash">{texts.remove}</IconLabel>}
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
