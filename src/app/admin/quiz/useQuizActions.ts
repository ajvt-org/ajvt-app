"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { api, errorMessage } from "@/lib/api";
import { counted } from "@/lib/arabicCount";
import { ANSWER, USER } from "@/lib/messages";
import type { QuestionFormValues } from "./QuestionFormDialog";
import type { QuestionRow, QuizSettings, SettingsForm as SettingsFormValues } from "./types";

interface SendResult {
  sentCount: number;
  skippedCount: number;
}

function validateQuestion(form: QuestionFormValues): string | null {
  if (!form.text.trim()) return "نص السؤال مطلوب";
  if (!form.category.trim()) return "التصنيف مطلوب";

  const points = Number(form.points);
  if (!Number.isInteger(points) || points <= 0) return "النقاط يجب أن تكون رقماً صحيحاً موجباً";

  const correctCount = Number(form.correctCount);
  if (!Number.isInteger(correctCount) || correctCount <= 0) return "عدد الإجابات الصحيحة غير صالح";
  if (form.answers.length < 2) return "يجب إضافة إجابتين على الأقل";
  if (form.answers.some((a) => !a.text.trim())) return "كل الإجابات يجب أن تحتوي على نص";
  if (correctCount > form.answers.length) return "عدد الإجابات الصحيحة أكبر من عدد الإجابات";
  if (form.answers.filter((a) => a.isCorrect).length !== correctCount) {
    return `يجب تحديد ${counted(correctCount, ANSWER)} صحيحة بالضبط`;
  }
  return null;
}

export function useQuizActions(reload: () => Promise<void>, setSettings: (s: QuizSettings) => void) {
  const showToast = useToast();

  const [settingsError, setSettingsError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendingRandom, setSendingRandom] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function saveSettings(settingsForm: SettingsFormValues) {
    setSettingsError("");
    const body: Record<string, number> = {};
    for (const [key, val] of Object.entries(settingsForm)) {
      const n = Number(val);
      const floorAllowed = key === "minScorePercent";
      if (!Number.isInteger(n) || (floorAllowed ? n < 0 : n <= 0)) {
        setSettingsError("كل القيم يجب أن تكون أرقاماً صحيحة موجبة");
        return;
      }
      body[key] = n;
    }
    if (body.defaultCorrectCount > body.defaultAnswerCount) {
      setSettingsError("عدد الإجابات الصحيحة لا يمكن أن يتجاوز عدد الإجابات");
      return;
    }
    if (body.minScorePercent > 100) {
      setSettingsError("أقل نسبة للنقاط يجب أن تكون بين 0 و 100");
      return;
    }
    setSavingSettings(true);
    try {
      const data = await api.patch<{ settings: QuizSettings }>("/api/admin/quiz/settings", body);
      setSettings(data.settings);
      showToast("تم حفظ الإعدادات");
    } catch (e) {
      setSettingsError(errorMessage(e));
    } finally {
      setSavingSettings(false);
    }
  }

  async function submitQuestionForm(
    form: QuestionFormValues,
    editingId: string | null,
  ): Promise<boolean> {
    const invalid = validateQuestion(form);
    setFormError(invalid ?? "");
    if (invalid) return false;

    setSaving(true);
    try {
      const body = {
        text: form.text.trim(),
        category: form.category.trim(),
        points: Number(form.points),
        correctCount: Number(form.correctCount),
        answers: form.answers.map((a) => ({ text: a.text.trim(), isCorrect: a.isCorrect })),
      };
      if (editingId) {
        await api.patch(`/api/admin/quiz/questions/${editingId}`, body);
      } else {
        await api.post("/api/admin/quiz/questions", body);
      }
      showToast(editingId ? "تم حفظ التعديل" : "تمت إضافة السؤال");
      await reload();
      return true;
    } catch (e) {
      setFormError(errorMessage(e));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(question: QuestionRow) {
    setBusyId(question.id);
    try {
      await api.patch(`/api/admin/quiz/questions/${question.id}`, { active: !question.active });
      await reload();
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  }

  function requestDeleteQuestion(id: string) {
    setDeletingId(id);
  }

  function cancelDeleteQuestion() {
    setDeletingId(null);
  }

  async function confirmDeleteQuestion() {
    const id = deletingId;
    if (!id) return;
    setBusyId(id);
    try {
      await api.del(`/api/admin/quiz/questions/${id}`);
      showToast("تم حذف السؤال");
      await reload();
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setBusyId(null);
      setDeletingId(null);
    }
  }

  async function send(body: Record<string, unknown>, describe: (data: SendResult) => string) {
    const res = await fetch("/api/admin/quiz/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "فشل الإرسال");
    showToast(describe(data));
    await reload();
  }

  async function sendSame(questionId: string) {
    setSendingId(questionId);
    try {
      await send(
        { mode: "SAME", questionId },
        (data) =>
          `تم الإرسال إلى ${counted(data.sentCount, USER)}` +
          (data.skippedCount
            ? ` (تم تخطي ${counted(data.skippedCount, USER)} ممن استلم السؤال سابقاً)`
            : ""),
      );
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setSendingId(null);
    }
  }

  async function sendRandom(randomCount: string) {
    setSendingRandom(true);
    try {
      const body: { mode: string; count?: number } = { mode: "RANDOM" };
      if (randomCount.trim()) body.count = Number(randomCount);
      await send(
        body,
        (data) =>
          `تم الإرسال إلى ${counted(data.sentCount, USER)}` +
          (data.skippedCount
            ? ` (تم تخطي ${counted(data.skippedCount, USER)} لعدم توفر أسئلة كافية)`
            : ""),
      );
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setSendingRandom(false);
    }
  }

  return {
    settingsError,
    savingSettings,
    saveSettings,
    formError,
    setFormError,
    saving,
    busyId,
    submitQuestionForm,
    toggleActive,
    deletingId,
    requestDeleteQuestion,
    cancelDeleteQuestion,
    confirmDeleteQuestion,
    sendingId,
    sendingRandom,
    sendSame,
    sendRandom,
  };
}
