"use client";

import SettingsForm from "./SettingsForm";
import QuestionList from "./QuestionList";
import ImportDialog from "./ImportDialog";
import QuestionFormDialog from "./QuestionFormDialog";
import type { AnswerFormRow } from "./types";
import type { QuizQuestionsState } from "./useQuizQuestions";

export default function QuestionsSection({ state }: { state: QuizQuestionsState }) {
  return (
    <div className="space-y-5">
      <SettingsForm
        values={state.settingsForm}
        error={state.settingsError}
        saving={state.savingSettings}
        onChange={(key, value) => state.setSettingsForm((p) => ({ ...p, [key]: value }))}
        onSubmit={state.saveSettings}
      />

      <QuestionList
        questions={state.questions}
        busyId={state.busyId}
        onCreate={state.openCreate}
        onImport={() => state.setShowImport(true)}
        onEdit={state.openEdit}
        onToggle={state.toggleActive}
        onDelete={state.deleteQuestion}
      />

      {state.showImport && (
        <ImportDialog onImported={() => state.load()} onClose={() => state.setShowImport(false)} />
      )}

      {state.showForm && (
        <QuestionFormDialog
          values={state.form}
          editing={!!state.editingId}
          error={state.formError}
          saving={state.saving}
          onChange={(patch) => state.setForm((p) => ({ ...p, ...patch }))}
          onAnswers={(answers: AnswerFormRow[]) => state.setForm((p) => ({ ...p, answers }))}
          onSubmit={state.submitQuestionForm}
          onClose={() => state.setShowForm(false)}
        />
      )}
    </div>
  );
}
