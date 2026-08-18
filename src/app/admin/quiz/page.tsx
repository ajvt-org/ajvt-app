"use client";

import { Suspense, useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import SettingsForm from "./SettingsForm";
import RandomSend from "./RandomSend";
import QuestionList from "./QuestionList";
import LeaderboardPanel from "./LeaderboardPanel";
import QuestionFormDialog, { type QuestionFormValues } from "./QuestionFormDialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useQuizData } from "./useQuizData";
import { useQuizActions } from "./useQuizActions";
import { useAdminListUrlState } from "@/hooks/useAdminListUrlState";
import { QUIZ_FILTER_KEYS, readQuizFilters, writeQuizFilters } from "./quizFilters";
import type { AnswerFormRow, QuestionRow } from "./types";

const emptyQuestionForm: QuestionFormValues = {
  text: "",
  category: "",
  points: "",
  correctCount: "",
  answers: [],
};

function AdminQuizPageInner() {
  const {
    settings,
    setSettings,
    settingsForm,
    setSettingsForm,
    questions,
    leaderboard,
    loading,
    reload,
  } = useQuizData();
  const actions = useQuizActions(reload, setSettings);
  const { filters, go } = useAdminListUrlState("/admin/quiz", {
    keys: QUIZ_FILTER_KEYS,
    readFilters: readQuizFilters,
    writeFilters: writeQuizFilters,
  });

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const filteredQuestions = questions.filter((q) => q.text.includes(filters.q.trim()));

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionFormValues>(emptyQuestionForm);
  const [randomCount, setRandomCount] = useState("");

  function openCreate() {
    setEditingId(null);
    setForm({
      text: "",
      category: "",
      points: String(settings?.defaultPoints ?? 10),
      correctCount: String(settings?.defaultCorrectCount ?? 1),
      answers: Array.from({ length: settings?.defaultAnswerCount ?? 4 }, () => ({
        text: "",
        isCorrect: false,
      })),
    });
    actions.setFormError("");
    setShowForm(true);
  }

  function openEdit(question: QuestionRow) {
    setEditingId(question.id);
    setForm({
      text: question.text,
      category: question.category,
      points: String(question.points),
      correctCount: String(question.correctCount),
      answers: question.answers.map((a) => ({ text: a.text, isCorrect: a.isCorrect })),
    });
    actions.setFormError("");
    setShowForm(true);
  }

  async function handleSubmitQuestionForm(ev: React.SubmitEvent<HTMLFormElement>) {
    ev.preventDefault();
    const ok = await actions.submitQuestionForm(form, editingId);
    if (ok) setShowForm(false);
  }

  async function handleSaveSettings(ev: React.SubmitEvent<HTMLFormElement>) {
    ev.preventDefault();
    await actions.saveSettings(settingsForm);
  }

  if (loading) {
    return (
      <div className="text-center py-16" style={{ color: "var(--mint-500)" }}>
        <div className="mb-3 flex justify-center animate-pulse">
          <Icon name="quiz" size={36} />
        </div>
        <p className="text-sm font-semibold">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="admin-page space-y-5">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="quiz">المسابقة الثقافية</IconLabel>
      </p>

      <SettingsForm
        values={settingsForm}
        error={actions.settingsError}
        saving={actions.savingSettings}
        onChange={(key, value) => setSettingsForm((p) => ({ ...p, [key]: value }))}
        onSubmit={handleSaveSettings}
      />

      <RandomSend
        count={randomCount}
        fallback={settings?.questionsPerDay ?? 1}
        sending={actions.sendingRandom}
        onCount={setRandomCount}
        onSend={() => actions.sendRandom(randomCount)}
      />

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="quiz">الأسئلة ({filteredQuestions.length})</IconLabel>
        </p>
        <button
          onClick={openCreate}
          className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
          style={{ background: "var(--mint-600)", color: "white" }}
        >
          <IconLabel name="plus">سؤال جديد</IconLabel>
        </button>
      </div>

      <input
        type="text"
        placeholder="بحث بنص السؤال..."
        value={filters.q}
        onChange={(e) => go({ q: e.target.value })}
        className="input text-sm"
      />

      <QuestionList
        questions={filteredQuestions}
        filtered={filters.q.trim().length > 0}
        sendingId={actions.sendingId}
        busyId={actions.busyId}
        onSend={actions.sendSame}
        onEdit={openEdit}
        onToggle={actions.toggleActive}
        onDelete={actions.requestDeleteQuestion}
      />

      <LeaderboardPanel
        rows={leaderboard}
        open={showLeaderboard}
        onToggle={() => setShowLeaderboard((v) => !v)}
      />

      {showForm && (
        <QuestionFormDialog
          values={form}
          editing={!!editingId}
          error={actions.formError}
          saving={actions.saving}
          onChange={(patch) => setForm((p) => ({ ...p, ...patch }))}
          onAnswers={(answers: AnswerFormRow[]) => setForm((p) => ({ ...p, answers }))}
          onSubmit={handleSubmitQuestionForm}
          onClose={() => setShowForm(false)}
        />
      )}

      {actions.deletingId && (
        <ConfirmDialog
          title="حذف السؤال"
          message="هل أنت متأكد من حذف هذا السؤال؟ سيتم حذف كل الإجابات المرتبطة به."
          confirmLabel="حذف نهائي"
          danger
          loading={actions.busyId === actions.deletingId}
          onConfirm={actions.confirmDeleteQuestion}
          onClose={actions.cancelDeleteQuestion}
        />
      )}
    </div>
  );
}

export default function AdminQuizPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-16" style={{ color: "var(--mint-500)" }}>
          <div className="mb-3 flex justify-center animate-pulse">
            <Icon name="quiz" size={36} />
          </div>
          <p className="text-sm font-semibold">جاري التحميل...</p>
        </div>
      }
    >
      <AdminQuizPageInner />
    </Suspense>
  );
}
