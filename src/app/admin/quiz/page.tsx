"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginPathWithNext } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import { api, errorMessage } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import SettingsForm from "./SettingsForm";
import RandomSend from "./RandomSend";
import QuestionList from "./QuestionList";
import LeaderboardPanel from "./LeaderboardPanel";
import QuestionFormDialog, { type QuestionFormValues } from "./QuestionFormDialog";
import { emptySettingsForm } from "./types";
import type {
  AnswerFormRow,
  LeaderboardRow,
  QuestionRow,
  QuizSettings,
  SettingsForm as SettingsFormValues,
} from "./types";

interface SendResult {
  sentCount: number;
  skippedCount: number;
}

const emptyQuestionForm: QuestionFormValues = {
  text: "",
  category: "",
  points: "",
  correctCount: "",
  answers: [],
};

export default function AdminQuizPage() {
  const router = useRouter();
  const showToast = useToast();

  const [settings, setSettings] = useState<QuizSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState<SettingsFormValues>(emptySettingsForm);
  const [settingsError, setSettingsError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionFormValues>(emptyQuestionForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [sendingId, setSendingId] = useState<string | null>(null);
  const [randomCount, setRandomCount] = useState("");
  const [sendingRandom, setSendingRandom] = useState(false);

  function load() {
    return Promise.all([
      fetch("/api/admin/quiz/settings").then((r) => {
        if (r.status === 401) {
          router.push(loginPathWithNext("/admin/login"));
          return null;
        }
        return r.ok ? r.json() : null;
      }),
      fetch("/api/admin/quiz/questions").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/admin/quiz/leaderboard").then((r) => (r.ok ? r.json() : null)),
    ]).then(([s, q, l]) => {
      if (s?.settings) {
        setSettings(s.settings);
        setSettingsForm({
          defaultAnswerCount: String(s.settings.defaultAnswerCount),
          defaultCorrectCount: String(s.settings.defaultCorrectCount),
          defaultPoints: String(s.settings.defaultPoints),
          questionsPerDay: String(s.settings.questionsPerDay),
          answerWindowSeconds: String(s.settings.answerWindowSeconds),
          minScorePercent: String(s.settings.minScorePercent),
        });
      }
      if (q?.questions) setQuestions(q.questions);
      if (l?.leaderboard) setLeaderboard(l.leaderboard);
    });
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveSettings(ev: React.SubmitEvent<HTMLFormElement>) {
    ev.preventDefault();
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
      return `يجب تحديد ${correctCount} إجابة (إجابات) صحيحة بالضبط`;
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
        await api.post("/api/admin/quiz/questions", body);
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

  async function send(body: Record<string, unknown>, describe: (data: SendResult) => string) {
    const res = await fetch("/api/admin/quiz/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "فشل الإرسال");
    showToast(describe(data));
    await load();
  }

  async function sendSame(questionId: string) {
    setSendingId(questionId);
    try {
      await send(
        { mode: "SAME", questionId },
        (data) =>
          `تم الإرسال إلى ${data.sentCount} مستخدم` +
          (data.skippedCount ? ` (تم تخطي ${data.skippedCount} استلموه من قبل)` : ""),
      );
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setSendingId(null);
    }
  }

  async function sendRandom() {
    setSendingRandom(true);
    try {
      const body: { mode: string; count?: number } = { mode: "RANDOM" };
      if (randomCount.trim()) body.count = Number(randomCount);
      await send(
        body,
        (data) =>
          `تم الإرسال إلى ${data.sentCount} مستخدم` +
          (data.skippedCount ? ` (${data.skippedCount} لم يتبق لهم أسئلة كافية)` : ""),
      );
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setSendingRandom(false);
    }
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
        error={settingsError}
        saving={savingSettings}
        onChange={(key, value) => setSettingsForm((p) => ({ ...p, [key]: value }))}
        onSubmit={saveSettings}
      />

      <RandomSend
        count={randomCount}
        fallback={settings?.questionsPerDay ?? 1}
        sending={sendingRandom}
        onCount={setRandomCount}
        onSend={sendRandom}
      />

      <QuestionList
        questions={questions}
        sendingId={sendingId}
        busyId={busyId}
        onCreate={openCreate}
        onSend={sendSame}
        onEdit={openEdit}
        onToggle={toggleActive}
        onDelete={deleteQuestion}
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
          error={formError}
          saving={saving}
          onChange={(patch) => setForm((p) => ({ ...p, ...patch }))}
          onAnswers={(answers: AnswerFormRow[]) => setForm((p) => ({ ...p, answers }))}
          onSubmit={submitQuestionForm}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
