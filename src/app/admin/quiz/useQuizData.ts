"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginPathWithNext } from "@/lib/utils";
import { emptySettingsForm } from "./types";
import type {
  LeaderboardRow,
  QuestionRow,
  QuizSettings,
  SettingsForm as SettingsFormValues,
} from "./types";

export function useQuizData() {
  const router = useRouter();
  const [settings, setSettings] = useState<QuizSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState<SettingsFormValues>(emptySettingsForm);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

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

  return {
    settings,
    setSettings,
    settingsForm,
    setSettingsForm,
    questions,
    leaderboard,
    loading,
    reload: load,
  };
}
