"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import PageHeader from "@/components/PageHeader";
import Icon from "@/components/Icon";
import QuizStats from "./QuizStats";
import QuestionCard from "./QuestionCard";
import QuizLeaderboard from "./QuizLeaderboard";
import type { AnswerResult, PendingAssignment, QuizMeData } from "./types";

export default function AssignmentsView({
  data,
  backHref,
  onReload,
}: {
  data: QuizMeData;
  backHref: string;
  onReload: () => void;
}) {
  const showToast = useToast();
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [revealing, setRevealing] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState<Set<string>>(new Set());
  const [answered, setAnswered] = useState<Record<string, AnswerResult>>({});
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<PendingAssignment[]>(data.pending);

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

  async function revealOptions(assignment: PendingAssignment) {
    setRevealing(assignment.id);
    try {
      const res = await fetch(`/api/quiz/assignments/${assignment.id}/reveal`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || "حدث خطأ", "error");
        return;
      }
      setPending((prev) =>
        prev.map((p) =>
          p.id === assignment.id
            ? {
                ...p,
                revealedAt: json.revealedAt,
                question: { ...p.question, answers: json.answers },
              }
            : p,
        ),
      );
    } catch {
      showToast("تعذر الاتصال بالخادم", "error");
    } finally {
      setRevealing(null);
    }
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
    onReload();
  }

  const visiblePending = pending.filter((p) => !dismissed.has(p.id));

  return (
    <div className="app-shell">
      <PageHeader title="المسابقة الثقافية" backHref={backHref} />

      <div className="px-5 py-6 pb-10 space-y-5">
        <QuizStats
          streak={data.streak.current}
          totalPoints={data.totalPoints}
          rank={data.rank}
          totalParticipants={data.totalParticipants}
        />

        {visiblePending.length === 0 ? (
          <div className="card p-8 text-center fade-up delay-1">
            <div className="mb-3 flex justify-center" style={{ color: "var(--mint-500)" }}>
              <Icon name="check" size={36} />
            </div>
            <p className="font-semibold" style={{ color: "var(--text-main)" }}>
              لا توجد أسئلة جديدة الآن
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              عد لاحقاً لمزيد من الأسئلة!
            </p>
          </div>
        ) : (
          visiblePending.map((assignment) => (
            <QuestionCard
              key={assignment.id}
              assignment={assignment}
              selected={selections[assignment.id] || []}
              result={answered[assignment.id]}
              submitting={submitting === assignment.id}
              revealing={revealing === assignment.id}
              windowSeconds={data.answerWindowSeconds}
              timedOut={timedOut.has(assignment.id)}
              onReveal={() => revealOptions(assignment)}
              onExpire={() => setTimedOut((prev) => new Set(prev).add(assignment.id))}
              onToggle={(answerId) => toggleAnswer(assignment, answerId)}
              onSubmit={() => submitAnswer(assignment)}
              onContinue={() => dismissAssignment(assignment.id)}
            />
          ))
        )}

        <QuizLeaderboard entries={data.top10} myRank={data.rank} totalPoints={data.totalPoints} />
      </div>
    </div>
  );
}
