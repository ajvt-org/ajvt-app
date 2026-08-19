"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import CompetitionsSection from "./CompetitionsSection";
import QuestionsSection from "./QuestionsSection";
import QuizTabs, { isQuizTab, type QuizTab } from "./QuizTabs";
import { useQuizQuestions } from "./useQuizQuestions";

function AdminQuizPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const asked = params.get("tab");
  const [tab, setTab] = useState<QuizTab>(isQuizTab(asked) ? asked : "competitions");
  const state = useQuizQuestions();

  function go(next: QuizTab) {
    setTab(next);
    router.replace(`/admin/quiz?tab=${next}`, { scroll: false });
  }

  if (state.loading) {
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
      <QuizTabs active={tab} onSelect={go} />

      {tab === "competitions" ? (
        <CompetitionsSection questionCount={state.questions.length} />
      ) : (
        <QuestionsSection state={state} />
      )}
    </div>
  );
}

export default function AdminQuizPage() {
  return (
    <Suspense fallback={null}>
      <AdminQuizPageInner />
    </Suspense>
  );
}
