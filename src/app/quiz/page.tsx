"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useInactivityLogout } from "@/lib/useInactivityLogout";
import { loginPathWithNext } from "@/lib/utils";
import { useToast } from "@/components/Toast";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const MEDALS = ["🥇", "🥈", "🥉"];

interface AnswerData {
  id: string;
  text: string;
  order: number;
}

interface QuestionData {
  id: string;
  text: string;
  category: string;
  points: number;
  correctCount: number;
  answers: AnswerData[];
}

interface PendingAssignment {
  id: string;
  sentAt: string;
  question: QuestionData;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  photoUrl: string | null;
  total: number;
}

interface QuizMeData {
  pending: PendingAssignment[];
  totalPoints: number;
  rank: number;
  totalParticipants: number;
  top10: LeaderboardEntry[];
  streak: { current: number; longest: number };
}

interface AnswerResult {
  isCorrect: boolean;
  pointsAwarded: number;
  correctAnswerIds: string[];
}

export default function QuizPage() {
  const router = useRouter();
  const showToast = useToast();

  const [data, setData] = useState<QuizMeData | null>(null);
  const [ineligible, setIneligible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [answered, setAnswered] = useState<Record<string, AnswerResult>>({});
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  function loadData() {
    return fetch("/api/quiz/me")
      .then((r) => {
        if (r.status === 401) {
          router.push(loginPathWithNext("/login"));
          return null;
        }
        if (r.status === 403) {
          setIneligible(true);
          return null;
        }
        return r.json();
      })
      .then((json) => {
        if (json) setData(json);
      })
      .catch(() => router.push(loginPathWithNext("/login")));
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }
  useInactivityLogout(IDLE_TIMEOUT_MS, logout, !loading);

  function toggleAnswer(assignment: PendingAssignment, answerId: string) {
    setSelections((prev) => {
      const current = prev[assignment.id] || [];
      if (assignment.question.correctCount === 1) {
        return { ...prev, [assignment.id]: [answerId] };
      }
      const next = current.includes(answerId)
        ? current.filter((id) => id !== answerId)
        : [...current, answerId];
      return { ...prev, [assignment.id]: next };
    });
  }

  async function submitAnswer(assignment: PendingAssignment) {
    const selectedAnswerIds = selections[assignment.id] || [];
    if (selectedAnswerIds.length === 0) return;

    setSubmitting(assignment.id);
    try {
      const res = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: assignment.id, selectedAnswerIds }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || "حدث خطأ", "error");
        return;
      }
      setAnswered((prev) => ({ ...prev, [assignment.id]: json }));
    } catch {
      showToast("تعذر الاتصال بالخادم", "error");
    } finally {
      setSubmitting(null);
    }
  }

  function dismissAssignment(assignmentId: string) {
    setDismissed((prev) => new Set(prev).add(assignmentId));
    loadData();
  }

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-center" style={{ color: "var(--mint-500)" }}>
          <div className="text-4xl mb-3 animate-pulse">🧠</div>
          <p className="text-sm font-semibold">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (ineligible) {
    return (
      <div className="app-shell">
        <div
          className="px-5 py-4 flex items-center gap-3"
          style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
        >
          <Image src="/version-final.png" alt="شعار" width={38} height={38} />
          <div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
              رابطة شباب قرية التاكلالت
            </p>
            <h1 className="text-base font-black text-white">🧠 المسابقة الثقافية</h1>
          </div>
        </div>
        <div className="px-5 py-10">
          <div className="card p-8 text-center fade-up">
            <div className="text-4xl mb-3">🔒</div>
            <p className="font-bold" style={{ color: "var(--text-main)" }}>
              المسابقة متاحة للمنتسبين فقط
            </p>
            <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
              يجب أن تكون منتسباً مقبولاً وقد دفعت رسوم الانتساب (100 أوقية) لتتمكن من المشاركة في
              المسابقة الثقافية.
            </p>
            <button onClick={() => router.push("/home")} className="btn btn-primary mt-5">
              العودة للرئيسية
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const visiblePending = data.pending.filter((p) => !dismissed.has(p.id));
  const rankIsTop3 = data.rank >= 1 && data.rank <= 3;
  const rankPercentile =
    data.totalParticipants > 1
      ? Math.max(
          0,
          Math.round(((data.totalParticipants - data.rank) / (data.totalParticipants - 1)) * 100),
        )
      : 100;

  return (
    <div className="app-shell">
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
      >
        <Image src="/version-final.png" alt="شعار" width={38} height={38} />
        <div>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
            رابطة شباب قرية التاكلالت
          </p>
          <h1 className="text-base font-black text-white">🧠 المسابقة الثقافية</h1>
        </div>
      </div>

      <div className="px-5 py-6 pb-10 space-y-5">
        {/* Stats bar: streak, points, rank */}
        <div className="grid grid-cols-3 gap-2 fade-up">
          <div className="card p-3 text-center">
            <div className="text-2xl">🔥</div>
            <p className="text-lg font-black" style={{ color: "var(--copper-600)" }}>
              {data.streak.current}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              يوم متتالي
            </p>
          </div>
          <div className="card p-3 text-center">
            <div className="text-2xl">⭐</div>
            <p className="text-lg font-black" style={{ color: "var(--mint-700)" }}>
              {data.totalPoints}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              نقطة
            </p>
          </div>
          <div
            className="card p-3 text-center"
            style={{
              background: rankIsTop3
                ? "linear-gradient(160deg, var(--copper-400), var(--copper-600))"
                : "linear-gradient(160deg, var(--mint-600), var(--mint-700))",
              boxShadow: rankIsTop3
                ? "0 4px 14px rgba(140,74,42,0.3)"
                : "0 4px 14px rgba(37,92,73,0.25)",
            }}
          >
            <div className="text-2xl">{rankIsTop3 ? MEDALS[data.rank - 1] : "🏅"}</div>
            <p className="text-lg font-black text-white">#{data.rank}</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.85)" }}>
              {data.totalParticipants > 1 ? `أفضل من ${rankPercentile}%` : "الأول"}
            </p>
          </div>
        </div>

        {/* Pending questions */}
        {visiblePending.length === 0 ? (
          <div className="card p-8 text-center fade-up delay-1">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-semibold" style={{ color: "var(--text-main)" }}>
              لا توجد أسئلة جديدة الآن
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              عد لاحقاً لمزيد من الأسئلة!
            </p>
          </div>
        ) : (
          visiblePending.map((assignment) => {
            const result = answered[assignment.id];
            const selected = selections[assignment.id] || [];
            const q = assignment.question;

            return (
              <div key={assignment.id} className="card p-5 space-y-4 fade-up delay-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="badge"
                    style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                  >
                    {q.category}
                  </span>
                  <span className="text-xs font-bold" style={{ color: "var(--copper-600)" }}>
                    ⭐ {q.points} نقطة
                  </span>
                </div>

                <p className="font-bold text-base" style={{ color: "var(--text-main)" }}>
                  {q.text}
                </p>

                {!result && q.correctCount > 1 && (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    اختر {q.correctCount} إجابات صحيحة
                  </p>
                )}

                <div className="space-y-2">
                  {q.answers.map((a) => {
                    const isSelected = selected.includes(a.id);
                    let style: React.CSSProperties = {
                      border: "1.5px solid var(--mint-200)",
                      background: "#fff",
                      color: "var(--text-main)",
                    };

                    if (result) {
                      const isCorrectAnswer = result.correctAnswerIds.includes(a.id);
                      if (isCorrectAnswer) {
                        style = {
                          border: "1.5px solid #10b981",
                          background: "#d1fae5",
                          color: "#065f46",
                        };
                      } else if (isSelected) {
                        style = {
                          border: "1.5px solid #ef4444",
                          background: "#fee2e2",
                          color: "#991b1b",
                        };
                      }
                    } else if (isSelected) {
                      style = {
                        border: "1.5px solid var(--mint-500)",
                        background: "var(--mint-100)",
                        color: "var(--mint-700)",
                      };
                    }

                    return (
                      <button
                        key={a.id}
                        type="button"
                        disabled={!!result}
                        onClick={() => toggleAnswer(assignment, a.id)}
                        className="w-full text-right px-4 py-3 rounded-xl font-semibold text-sm transition-all"
                        style={{ ...style, cursor: result ? "default" : "pointer" }}
                      >
                        {a.text}
                      </button>
                    );
                  })}
                </div>

                {!result ? (
                  <button
                    className="btn btn-primary"
                    disabled={selected.length === 0 || submitting === assignment.id}
                    onClick={() => submitAnswer(assignment)}
                  >
                    {submitting === assignment.id ? "..." : "إرسال الإجابة"}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div
                      className="rounded-xl p-3 text-center font-bold"
                      style={{
                        background: result.isCorrect ? "#d1fae5" : "#fee2e2",
                        color: result.isCorrect ? "#065f46" : "#991b1b",
                      }}
                    >
                      {result.isCorrect
                        ? `✅ إجابة صحيحة! +${result.pointsAwarded} نقطة`
                        : "❌ إجابة خاطئة"}
                    </div>
                    <button
                      className="btn btn-outline"
                      onClick={() => dismissAssignment(assignment.id)}
                    >
                      متابعة
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Top 10 leaderboard */}
        <div className="card overflow-x-auto fade-up delay-2">
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--mint-100)" }}>
            <h2 className="font-black text-sm" style={{ color: "var(--mint-700)" }}>
              🏆 الأفضل في المسابقة الثقافية{" "}
            </h2>
          </div>
          {data.top10.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>
              لا يوجد مشاركون بعد
            </p>
          ) : (
            <table className="w-full text-sm" style={{ minWidth: "320px" }}>
              <tbody>
                {data.top10.map((entry) => (
                  <tr
                    key={entry.userId}
                    style={{
                      borderTop: "1px solid var(--mint-100)",
                      borderRight:
                        entry.rank === data.rank
                          ? "3px solid var(--mint-600)"
                          : "3px solid transparent",
                      background: entry.rank === data.rank ? "var(--mint-50)" : "transparent",
                    }}
                  >
                    <td className="px-3 py-2.5 text-center" style={{ width: "18%" }}>
                      <span
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-black"
                        style={{
                          background:
                            entry.rank <= 3
                              ? "linear-gradient(160deg, var(--copper-400), var(--copper-600))"
                              : "var(--mint-100)",
                          color: entry.rank <= 3 ? "#fff" : "var(--mint-700)",
                        }}
                      >
                        {entry.rank <= 3 ? MEDALS[entry.rank - 1] : entry.rank}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-bold" style={{ color: "var(--text-main)" }}>
                      {entry.name}
                    </td>
                    <td
                      className="px-3 py-2.5 text-center font-black"
                      style={{ color: "var(--mint-700)" }}
                    >
                      {entry.total} نقطة
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {data.rank > 10 && (
            <div
              className="px-4 py-3 flex items-center justify-between gap-2"
              style={{
                borderTop: "1.5px solid var(--mint-200)",
                background: "linear-gradient(135deg, var(--mint-100), var(--mint-50))",
              }}
            >
              <span className="flex items-center gap-2.5">
                <span
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-black text-white shrink-0"
                  style={{
                    background: "linear-gradient(160deg, var(--mint-600), var(--mint-700))",
                  }}
                >
                  {data.rank}
                </span>
                <span className="text-sm font-bold" style={{ color: "var(--mint-700)" }}>
                  أنت
                </span>
              </span>
              <span className="text-sm font-black" style={{ color: "var(--mint-700)" }}>
                {data.totalPoints} نقطة
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
