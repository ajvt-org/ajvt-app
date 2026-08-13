"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginPathWithNext } from "@/lib/utils";
import { useToast } from "@/components/Toast";

const MEDALS = ["🥇", "🥈", "🥉"];

interface AnswerRow {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

interface QuestionRow {
  id: string;
  text: string;
  category: string;
  points: number;
  correctCount: number;
  active: boolean;
  createdAt: string;
  answers: AnswerRow[];
  sentCount: number;
  answeredCount: number;
  correctSubmissions: number;
}

interface QuizSettings {
  defaultAnswerCount: number;
  defaultCorrectCount: number;
  defaultPoints: number;
  questionsPerDay: number;
}

interface LeaderboardRow {
  rank: number;
  userId: string;
  name: string;
  photoUrl: string | null;
  total: number;
  currentStreak: number;
  longestStreak: number;
}

interface AnswerFormRow {
  text: string;
  isCorrect: boolean;
}

const emptySettingsForm = { defaultAnswerCount: "4", defaultCorrectCount: "1", defaultPoints: "10", questionsPerDay: "1" };

export default function AdminQuizPage() {
  const router = useRouter();
  const showToast = useToast();

  const [settings, setSettings] = useState<QuizSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState(emptySettingsForm);
  const [settingsError, setSettingsError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formText, setFormText] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formPoints, setFormPoints] = useState("");
  const [formCorrectCount, setFormCorrectCount] = useState("");
  const [formAnswers, setFormAnswers] = useState<AnswerFormRow[]>([]);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [sendingId, setSendingId] = useState<string | null>(null);
  const [randomCount, setRandomCount] = useState("");
  const [sendingRandom, setSendingRandom] = useState(false);

  function load() {
    return Promise.all([
      fetch("/api/admin/quiz/settings").then((r) => {
        if (r.status === 401) { router.push(loginPathWithNext("/admin/login")); return null; }
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

  async function saveSettings(ev: React.FormEvent) {
    ev.preventDefault();
    setSettingsError("");
    const body: Record<string, number> = {};
    for (const [key, val] of Object.entries(settingsForm)) {
      const n = Number(val);
      if (!Number.isInteger(n) || n <= 0) {
        setSettingsError("كل القيم يجب أن تكون أرقاماً صحيحة موجبة");
        return;
      }
      body[key] = n;
    }
    if (body.defaultCorrectCount > body.defaultAnswerCount) {
      setSettingsError("عدد الإجابات الصحيحة لا يمكن أن يتجاوز عدد الإجابات");
      return;
    }
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/quiz/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setSettings(data.settings);
      showToast("تم حفظ الإعدادات");
    } catch (e) {
      setSettingsError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setSavingSettings(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    const count = settings?.defaultAnswerCount ?? 4;
    setFormText("");
    setFormCategory("");
    setFormPoints(String(settings?.defaultPoints ?? 10));
    setFormCorrectCount(String(settings?.defaultCorrectCount ?? 1));
    setFormAnswers(Array.from({ length: count }, () => ({ text: "", isCorrect: false })));
    setFormError("");
    setShowForm(true);
  }

  function openEdit(q: QuestionRow) {
    setEditingId(q.id);
    setFormText(q.text);
    setFormCategory(q.category);
    setFormPoints(String(q.points));
    setFormCorrectCount(String(q.correctCount));
    setFormAnswers(q.answers.map((a) => ({ text: a.text, isCorrect: a.isCorrect })));
    setFormError("");
    setShowForm(true);
  }

  function addAnswerRow() {
    setFormAnswers((prev) => [...prev, { text: "", isCorrect: false }]);
  }

  function removeAnswerRow(index: number) {
    setFormAnswers((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev));
  }

  function updateAnswerText(index: number, text: string) {
    setFormAnswers((prev) => prev.map((a, i) => (i === index ? { ...a, text } : a)));
  }

  function toggleAnswerCorrect(index: number) {
    setFormAnswers((prev) => prev.map((a, i) => (i === index ? { ...a, isCorrect: !a.isCorrect } : a)));
  }

  async function submitQuestionForm(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError("");

    if (!formText.trim()) { setFormError("نص السؤال مطلوب"); return; }
    if (!formCategory.trim()) { setFormError("التصنيف مطلوب"); return; }
    const points = Number(formPoints);
    if (!Number.isInteger(points) || points <= 0) { setFormError("النقاط يجب أن تكون رقماً صحيحاً موجباً"); return; }
    const correctCount = Number(formCorrectCount);
    if (!Number.isInteger(correctCount) || correctCount <= 0) { setFormError("عدد الإجابات الصحيحة غير صالح"); return; }
    if (formAnswers.length < 2) { setFormError("يجب إضافة إجابتين على الأقل"); return; }
    if (formAnswers.some((a) => !a.text.trim())) { setFormError("كل الإجابات يجب أن تحتوي على نص"); return; }
    if (correctCount > formAnswers.length) { setFormError("عدد الإجابات الصحيحة أكبر من عدد الإجابات"); return; }
    const correctGiven = formAnswers.filter((a) => a.isCorrect).length;
    if (correctGiven !== correctCount) { setFormError(`يجب تحديد ${correctCount} إجابة (إجابات) صحيحة بالضبط`); return; }

    setSaving(true);
    try {
      const body = {
        text: formText.trim(),
        category: formCategory.trim(),
        points,
        correctCount,
        answers: formAnswers.map((a) => ({ text: a.text.trim(), isCorrect: a.isCorrect })),
      };
      const res = await fetch(editingId ? `/api/admin/quiz/questions/${editingId}` : "/api/admin/quiz/questions", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setShowForm(false);
      showToast(editingId ? "تم حفظ التعديل" : "تمت إضافة السؤال");
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(q: QuestionRow) {
    setBusyId(q.id);
    try {
      const res = await fetch(`/api/admin/quiz/questions/${q.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !q.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "خطأ", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteQuestion(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا السؤال؟ سيتم حذف كل الإجابات المرتبطة به.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/quiz/questions/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      showToast("تم حذف السؤال");
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "خطأ", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function sendSame(questionId: string) {
    setSendingId(questionId);
    try {
      const res = await fetch("/api/admin/quiz/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "SAME", questionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الإرسال");
      showToast(
        `تم الإرسال إلى ${data.sentCount} مستخدم` + (data.skippedCount ? ` (تم تخطي ${data.skippedCount} استلموه من قبل)` : "")
      );
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "خطأ", "error");
    } finally {
      setSendingId(null);
    }
  }

  async function sendRandom() {
    setSendingRandom(true);
    try {
      const body: { mode: string; count?: number } = { mode: "RANDOM" };
      if (randomCount.trim()) body.count = Number(randomCount);
      const res = await fetch("/api/admin/quiz/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الإرسال");
      showToast(
        `تم الإرسال إلى ${data.sentCount} مستخدم` + (data.skippedCount ? ` (${data.skippedCount} لم يتبق لهم أسئلة كافية)` : "")
      );
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "خطأ", "error");
    } finally {
      setSendingRandom(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-16" style={{ color: "var(--mint-500)" }}>
        <div className="text-4xl animate-pulse mb-3">🧠</div>
        <p className="text-sm font-semibold">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>🧠 المسابقة الثقافية</p>

      {/* Settings */}
      <form onSubmit={saveSettings} className="card p-4 space-y-3">
        <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>⚙️ الإعدادات الافتراضية</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--text-main)" }}>عدد الإجابات الافتراضي</label>
            <input type="number" dir="ltr" min={2} className="input text-sm" value={settingsForm.defaultAnswerCount}
              onChange={(e) => setSettingsForm((p) => ({ ...p, defaultAnswerCount: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--text-main)" }}>عدد الإجابات الصحيحة الافتراضي</label>
            <input type="number" dir="ltr" min={1} className="input text-sm" value={settingsForm.defaultCorrectCount}
              onChange={(e) => setSettingsForm((p) => ({ ...p, defaultCorrectCount: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--text-main)" }}>النقاط الافتراضية للسؤال</label>
            <input type="number" dir="ltr" min={1} className="input text-sm" value={settingsForm.defaultPoints}
              onChange={(e) => setSettingsForm((p) => ({ ...p, defaultPoints: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--text-main)" }}>عدد الأسئلة المرسلة يومياً</label>
            <input type="number" dir="ltr" min={1} className="input text-sm" value={settingsForm.questionsPerDay}
              onChange={(e) => setSettingsForm((p) => ({ ...p, questionsPerDay: e.target.value }))} />
          </div>
        </div>
        {settingsError && (
          <div className="p-2.5 rounded-lg text-xs font-semibold" style={{ background: "#fee2e2", color: "#991b1b" }}>⚠️ {settingsError}</div>
        )}
        <button type="submit" disabled={savingSettings} className="text-xs px-3 py-2 rounded-lg font-bold" style={{ background: "var(--mint-600)", color: "white" }}>
          {savingSettings ? "..." : "💾 حفظ الإعدادات"}
        </button>
      </form>

      {/* Random send */}
      <div className="card p-4 space-y-2">
        <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>🎲 إرسال دفعة عشوائية (سؤال مختلف محتمل لكل مستخدم، بدون تكرار)</p>
        <div className="flex gap-2">
          <input
            type="number"
            dir="ltr"
            min={1}
            placeholder={`العدد (افتراضي: ${settings?.questionsPerDay ?? 1})`}
            className="input text-sm"
            value={randomCount}
            onChange={(e) => setRandomCount(e.target.value)}
          />
          <button
            onClick={sendRandom}
            disabled={sendingRandom}
            className="text-xs px-4 py-2 rounded-lg font-bold shrink-0"
            style={{ background: "var(--copper-500)", color: "white" }}
          >
            {sendingRandom ? "..." : "🎲 إرسال عشوائي"}
          </button>
        </div>
      </div>

      {/* Questions */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>❓ الأسئلة ({questions.length})</p>
        <button onClick={openCreate} className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0" style={{ background: "var(--mint-600)", color: "white" }}>
          ➕ سؤال جديد
        </button>
      </div>

      {questions.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>لا توجد أسئلة مسجلة بعد</p>
      ) : (
        <div className="space-y-2">
          {questions.map((q) => (
            <div key={q.id} className="card p-3 space-y-2" style={{ opacity: q.active ? 1 : 0.6 }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>{q.text}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {q.category} · ⭐ {q.points} نقطة · {q.correctCount} إجابة صحيحة من {q.answers.length}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--mint-600)" }}>
                    أُرسلت لـ {q.sentCount} · أُجيبت {q.answeredCount} · صحيحة {q.correctSubmissions}
                  </p>
                </div>
                {!q.active && (
                  <span className="badge shrink-0" style={{ background: "var(--mint-100)", color: "var(--text-muted)" }}>معطّل</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => sendSame(q.id)}
                  disabled={sendingId === q.id || !q.active}
                  className="text-xs px-3 py-1.5 rounded-lg font-bold"
                  style={{ background: "var(--mint-600)", color: "white" }}
                >
                  {sendingId === q.id ? "..." : "📤 إرسال للجميع"}
                </button>
                <button onClick={() => openEdit(q)} disabled={busyId === q.id} className="text-xs px-3 py-1.5 rounded-lg font-bold" style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}>
                  ✏️ تعديل
                </button>
                <button onClick={() => toggleActive(q)} disabled={busyId === q.id} className="text-xs px-3 py-1.5 rounded-lg font-bold" style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}>
                  {q.active ? "⏸️ إيقاف" : "▶️ تفعيل"}
                </button>
                <button onClick={() => deleteQuestion(q.id)} disabled={busyId === q.id} className="text-xs px-3 py-1.5 rounded-lg font-bold" style={{ background: "#fee2e2", color: "#991b1b" }}>
                  {busyId === q.id ? "..." : "🗑️ حذف"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      <div className="card overflow-hidden">
        <button onClick={() => setShowLeaderboard((v) => !v)} className="w-full flex items-center justify-between px-4 py-3">
          <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>🏆 الترتيب الكامل ({leaderboard.length})</p>
          <span style={{ color: "var(--mint-600)" }}>{showLeaderboard ? "▾" : "◂"}</span>
        </button>
        {showLeaderboard && (
          <div className="overflow-x-auto" style={{ borderTop: "1px solid var(--mint-100)" }}>
            <table className="w-full text-sm" style={{ minWidth: "360px" }}>
              <thead>
                <tr style={{ background: "var(--mint-100)" }}>
                  {["#", "المستخدم", "النقاط", "🔥"].map((h) => (
                    <th key={h} className="px-3 py-2 text-center font-bold" style={{ color: "var(--mint-700)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr key={entry.userId} style={{ borderTop: "1px solid var(--mint-100)" }}>
                    <td className="px-3 py-2 text-center">
                      <span
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black"
                        style={{
                          background: entry.rank <= 3 ? "linear-gradient(160deg, var(--copper-400), var(--copper-600))" : "var(--mint-100)",
                          color: entry.rank <= 3 ? "#fff" : "var(--mint-700)",
                        }}
                      >
                        {entry.rank <= 3 ? MEDALS[entry.rank - 1] : entry.rank}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-bold" style={{ color: "var(--text-main)" }}>{entry.name}</td>
                    <td className="px-3 py-2 text-center font-black" style={{ color: "var(--mint-700)" }}>{entry.total}</td>
                    <td className="px-3 py-2 text-center" style={{ color: "var(--copper-600)" }}>{entry.currentStreak}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Question form modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(ev) => { if (ev.target === ev.currentTarget) setShowForm(false); }}
        >
          <div className="w-full max-w-md rounded-t-3xl md:rounded-2xl overflow-y-auto" style={{ background: "var(--mint-50)", maxHeight: "92svh", direction: "rtl" }}>
            <div className="px-5 py-4 flex items-center justify-between sticky top-0" style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}>
              <h2 className="font-black text-white text-base">{editingId ? "✏️ تعديل سؤال" : "➕ سؤال جديد"}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{ background: "rgba(255,255,255,0.15)" }}>✕</button>
            </div>

            <form onSubmit={submitQuestionForm} className="p-5 space-y-3">
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>نص السؤال <span style={{ color: "var(--copper-500)" }}>*</span></label>
                <textarea value={formText} onChange={(e) => setFormText(e.target.value)} rows={2} required className="input" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>التصنيف <span style={{ color: "var(--copper-500)" }}>*</span></label>
                <input type="text" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="تاريخ، رياضة، جغرافيا..." required className="input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>النقاط</label>
                  <input type="number" dir="ltr" min={1} value={formPoints} onChange={(e) => setFormPoints(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>عدد الإجابات الصحيحة</label>
                  <input type="number" dir="ltr" min={1} value={formCorrectCount} onChange={(e) => setFormCorrectCount(e.target.value)} className="input" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold" style={{ color: "var(--text-main)" }}>الإجابات</label>
                  <button type="button" onClick={addAnswerRow} className="text-xs px-2.5 py-1 rounded-lg font-bold" style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}>
                    ➕ إضافة إجابة
                  </button>
                </div>
                {formAnswers.map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleAnswerCorrect(i)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 font-bold"
                      style={a.isCorrect ? { background: "#d1fae5", color: "#065f46" } : { background: "#fff", border: "1.5px solid var(--mint-200)", color: "var(--text-muted)" }}
                      title="إجابة صحيحة؟"
                    >
                      {a.isCorrect ? "✓" : ""}
                    </button>
                    <input type="text" value={a.text} onChange={(e) => updateAnswerText(i, e.target.value)} className="input text-sm" placeholder={`إجابة ${i + 1}`} />
                    <button type="button" onClick={() => removeAnswerRow(i)} disabled={formAnswers.length <= 2} className="text-sm shrink-0" style={{ color: "#dc2626", opacity: formAnswers.length <= 2 ? 0.3 : 1 }}>
                      🗑️
                    </button>
                  </div>
                ))}
              </div>

              {formError && (
                <div className="p-3 rounded-xl text-sm font-semibold" style={{ background: "#fee2e2", color: "#991b1b" }}>⚠️ {formError}</div>
              )}

              <button type="submit" disabled={saving} className="btn btn-primary text-sm">
                {saving ? "..." : editingId ? "💾 حفظ التعديل" : "إضافة السؤال"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
