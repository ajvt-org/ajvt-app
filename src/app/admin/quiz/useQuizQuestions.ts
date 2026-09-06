"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginPathWithNext } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import { api, errorMessage } from "@/lib/api";
import { counted } from "@/lib/arabicCount";
import { ANSWER } from "@/lib/messages";
import { validateCurve } from "@/lib/competitionConfig";
import type { MoveDirection } from "@/lib/quizQuestionOrder";
import { emptySettingsForm } from "./types";
import type { BankRow } from "./BankPicker";
import type { QuestionFormValues } from "./QuestionFormDialog";
import type { QuestionRow, QuizSettings, SettingsForm as SettingsFormValues } from "./types";

const ZERO_IS_ALLOWED = new Set(["tutorialFullSeconds", "tutorialFloorPercent"]);

const emptyQuestionForm: QuestionFormValues = {
  text: "",
  category: "",
  points: "",
  correctCount: "",
  answers: [],
};

export function useQuizQuestions() {
  const router = useRouter();
  const showToast = useToast();

  const [settings, setSettings] = useState<QuizSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState<SettingsFormValues>(emptySettingsForm);
  const [settingsError, setSettingsError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [banks, setBanks] = useState<BankRow[]>([]);
  const [bankId, setBankId] = useState<string | null>(null);
  const [bankBusy, setBankBusy] = useState(false);
  const [bankError, setBankError] = useState("");
  const [loading, setLoading] = useState(true);

  const [showImport, setShowImport] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionFormValues>(emptyQuestionForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load(bank: string | null = bankId) {
    const query = bank ? `?bank=${bank}` : "";
    return Promise.all([
      fetch("/api/admin/quiz/settings").then((r) => {
        if (r.status === 401) {
          router.push(loginPathWithNext("/admin/login"));
          return null;
        }
        return r.ok ? r.json() : null;
      }),
      fetch(`/api/admin/quiz/questions${query}`).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/admin/quiz/banks").then((r) => (r.ok ? r.json() : null)),
    ]).then(([s, q, b]) => {
      if (s?.settings) {
        setSettings(s.settings);
        setSettingsForm({
          defaultAnswerCount: String(s.settings.defaultAnswerCount),
          defaultCorrectCount: String(s.settings.defaultCorrectCount),
          defaultPoints: String(s.settings.defaultPoints),
          tutorialFullSeconds: String(s.settings.tutorialFullSeconds),
          tutorialMaxSeconds: String(s.settings.tutorialMaxSeconds),
          tutorialFloorPercent: String(s.settings.tutorialFloorPercent),
        });
      }
      if (q?.questions) setQuestions(q.questions);
      if (q?.bank) setBankId(q.bank.id);
      if (b?.banks) setBanks(b.banks);
    });
  }

  async function bankAction(run: () => Promise<unknown>) {
    setBankBusy(true);
    setBankError("");
    try {
      await run();
      await load();
    } catch (e) {
      setBankError(errorMessage(e));
    } finally {
      setBankBusy(false);
    }
  }

  function openBank(id: string) {
    setBankId(id);
    load(id);
  }

  const createBank = (name: string) =>
    bankAction(() => api.post("/api/admin/quiz/banks", { name }));
  const renameBank = (id: string, name: string) =>
    bankAction(() => api.patch(`/api/admin/quiz/banks/${id}`, { name }));
  const deleteBank = (id: string) =>
    bankAction(async () => {
      await api.del(`/api/admin/quiz/banks/${id}`);
      if (id === bankId) setBankId(null);
    });

  useEffect(() => {
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleConfirm() {
    if (!settings || savingSettings) return;
    setSavingSettings(true);
    try {
      const data = await api.patch<{ settings: QuizSettings }>("/api/admin/quiz/settings", {
        confirmAnswers: !settings.confirmAnswers,
      });
      setSettings(data.settings);
      showToast(
        data.settings.confirmAnswers
          ? "أعيد زر تأكيد الإجابة، ويسري من الجولة القادمة"
          : "أصبح اختيار الإجابة يرسلها مباشرة، ويسري من الجولة القادمة",
      );
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setSavingSettings(false);
    }
  }

  async function saveSettings(ev: React.SubmitEvent<HTMLFormElement>) {
    ev.preventDefault();
    setSettingsError("");
    const body: Record<string, number> = {};
    for (const [key, val] of Object.entries(settingsForm)) {
      const n = Number(val);
      const floor = ZERO_IS_ALLOWED.has(key) ? 0 : 1;
      if (!Number.isInteger(n) || n < floor) {
        setSettingsError("كل القيم يجب أن تكون أرقاماً صحيحة موجبة");
        return;
      }
      body[key] = n;
    }
    if (body.defaultCorrectCount > body.defaultAnswerCount) {
      setSettingsError("عدد الإجابات الصحيحة لا يمكن أن يتجاوز عدد الإجابات");
      return;
    }
    const curveProblem = validateCurve({
      fullSeconds: body.tutorialFullSeconds,
      maxSeconds: body.tutorialMaxSeconds,
      floorPercent: body.tutorialFloorPercent,
    });
    if (curveProblem) {
      setSettingsError(curveProblem);
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
    setFormError("");
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
    setFormError("");
    setShowForm(true);
  }

  function validateQuestion(): string | null {
    if (!form.text.trim()) return "نص السؤال مطلوب";
    if (!form.category.trim()) return "التصنيف مطلوب";

    const points = Number(form.points);
    if (!Number.isInteger(points) || points <= 0) return "النقاط يجب أن تكون رقماً صحيحاً موجباً";

    const correctCount = Number(form.correctCount);
    if (!Number.isInteger(correctCount) || correctCount <= 0)
      return "عدد الإجابات الصحيحة غير صالح";
    if (form.answers.length < 2) return "يجب إضافة إجابتين على الأقل";
    if (form.answers.some((a) => !a.text.trim())) return "كل الإجابات يجب أن تحتوي على نص";
    if (correctCount > form.answers.length) return "عدد الإجابات الصحيحة أكبر من عدد الإجابات";
    if (form.answers.filter((a) => a.isCorrect).length !== correctCount) {
      return `يجب تحديد ${counted(correctCount, ANSWER)} صحيحة بالضبط`;
    }
    return null;
  }

  async function submitQuestionForm(ev: React.SubmitEvent<HTMLFormElement>) {
    ev.preventDefault();
    const invalid = validateQuestion();
    setFormError(invalid ?? "");
    if (invalid) return;

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
        await api.post("/api/admin/quiz/questions", { ...body, bankId });
      }
      setShowForm(false);
      showToast(editingId ? "تم حفظ التعديل" : "تمت إضافة السؤال");
      await load();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(question: QuestionRow) {
    setBusyId(question.id);
    try {
      await api.patch(`/api/admin/quiz/questions/${question.id}`, { active: !question.active });
      await load();
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function moveQuestion(question: QuestionRow, direction: MoveDirection) {
    setBusyId(question.id);
    try {
      await api.post(`/api/admin/quiz/questions/${question.id}/move`, { direction });
      await load();
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteQuestion(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا السؤال؟ سيتم حذف كل الإجابات المرتبطة به.")) return;
    setBusyId(id);
    try {
      await api.del(`/api/admin/quiz/questions/${id}`);
      showToast("تم حذف السؤال");
      await load();
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  }

  return {
    loading,
    questions,
    banks,
    bankId,
    bankBusy,
    bankError,
    openBank,
    createBank,
    renameBank,
    deleteBank,
    settings,
    settingsForm,
    settingsError,
    savingSettings,
    setSettingsForm,
    saveSettings,
    toggleConfirm,
    showImport,
    setShowImport,
    showForm,
    setShowForm,
    editingId,
    form,
    setForm,
    formError,
    saving,
    busyId,
    load,
    openCreate,
    openEdit,
    submitQuestionForm,
    toggleActive,
    moveQuestion,
    deleteQuestion,
  };
}

export type QuizQuestionsState = ReturnType<typeof useQuizQuestions>;
