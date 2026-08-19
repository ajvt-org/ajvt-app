"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useInactivityLogout } from "@/lib/useInactivityLogout";
import Icon from "@/components/Icon";
import { goAfterAuthChange } from "@/lib/authNav";
import CompetitionView, { type StandingsState } from "./CompetitionView";
import QuizLocked, { CreateAccountAction } from "./QuizLocked";
import QuizPicker from "./QuizPicker";
import TutorialQuiz from "./TutorialQuiz";
import type { RunningCompetition } from "./types";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export default function QuizPage() {
  const router = useRouter();

  const [mine, setMine] = useState<RunningCompetition[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [tutorial, setTutorial] = useState(false);
  const [standings, setStandings] = useState<StandingsState | null>(null);
  const [ineligible, setIneligible] = useState(false);
  const [visitor, setVisitor] = useState(false);
  const [loading, setLoading] = useState(true);

  function loadMine() {
    return fetch("/api/quiz/competitions")
      .then((r) => {
        if (r.status === 401) {
          setVisitor(true);
          return null;
        }
        if (r.status === 403) {
          setIneligible(true);
          return null;
        }
        return r.json();
      })
      .then((json) => {
        if (json) setMine(json.competitions);
      })
      .catch(() => setVisitor(true));
  }

  const loadStandings = useCallback(() => {
    if (!chosen) return Promise.resolve();
    return fetch(`/api/quiz/standings?competition=${chosen}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json) setStandings(json);
      })
      .catch(() => {});
  }, [chosen]);

  useEffect(() => {
    loadMine().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadStandings();
  }, [loadStandings]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    goAfterAuthChange(router, "/");
  }
  useInactivityLogout(IDLE_TIMEOUT_MS, logout, !loading);

  const backHref = visitor ? "/activities" : "/home";

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-center" style={{ color: "var(--mint-500)" }}>
          <div className="mb-3 flex justify-center animate-pulse">
            <Icon name="quiz" size={40} />
          </div>
          <p className="text-sm font-semibold">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (visitor) {
    return (
      <QuizLocked
        backHref={backHref}
        message="أنشئ حساباً وأكمل استمارة الانضمام للمشاركة في المسابقات الثقافية."
        action={<CreateAccountAction />}
      />
    );
  }

  if (ineligible) {
    return (
      <QuizLocked
        backHref={backHref}
        message="يجب أن تكون منتسباً مقبولاً وقد دفعت رسوم الانتساب لتتمكن من المشاركة في المسابقات الثقافية."
        action={
          <button onClick={() => router.push("/home")} className="btn btn-primary">
            العودة للرئيسية
          </button>
        }
      />
    );
  }

  if (tutorial) {
    return <TutorialQuiz onExit={() => setTutorial(false)} />;
  }

  if (chosen && standings?.running) {
    return (
      <CompetitionView
        standings={standings}
        onBack={() => setChosen(null)}
        onReloadStandings={loadStandings}
      />
    );
  }

  return (
    <QuizPicker
      competitions={mine}
      backHref={backHref}
      onPick={setChosen}
      onTutorial={() => setTutorial(true)}
    />
  );
}
