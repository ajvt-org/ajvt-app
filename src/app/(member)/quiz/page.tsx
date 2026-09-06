"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useInactivityLogout } from "@/lib/useInactivityLogout";
import Icon from "@/components/Icon";
import { goAfterAuthChange } from "@/lib/authNav";
import CompetitionView, { type StandingsState } from "./CompetitionView";
import QuizLocked, { CreateAccountAction } from "./QuizLocked";
import QuizPicker from "./QuizPicker";
import TutorialQuiz from "./TutorialQuiz";
import type { RunningCompetition } from "./types";
import type { TutorialView } from "@/lib/quizTutorialServer";
import type { ScoreCurve } from "@/lib/competitionConfig";
import { quizBoard as texts } from "@/lib/texts";
import { safeNextPath } from "@/lib/utils";
import { withFrom } from "@/lib/backLink";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

function quizPath(from: string | null, competition: string | null): string {
  const params = new URLSearchParams();
  if (competition) params.set("competition", competition);
  if (from) params.set("from", from);
  const query = params.toString();
  return query ? `/quiz?${query}` : "/quiz";
}

export default function QuizPage() {
  return (
    <Suspense fallback={null}>
      <QuizScreen />
    </Suspense>
  );
}

function QuizScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const chosen = params.get("competition");
  const from = params.get("from");

  const [mine, setMine] = useState<RunningCompetition[]>([]);
  const [confirmAnswers, setConfirmAnswers] = useState(true);
  const [tutorial, setTutorial] = useState(false);
  const [practice, setPractice] = useState<{ questions: TutorialView[]; curve: ScoreCurve } | null>(
    null,
  );
  const [standings, setStandings] = useState<StandingsState | null>(null);
  const [ineligible, setIneligible] = useState(false);
  const [visitor, setVisitor] = useState(false);
  const [canPlay, setCanPlay] = useState(true);
  const [loading, setLoading] = useState(true);
  const wasChosen = useRef(false);

  const loadMine = useCallback(async () => {
    try {
      const res = await fetch("/api/quiz/competitions");
      const json = await res.json();
      setMine(json.competitions ?? []);
      setConfirmAnswers(json.confirmAnswers ?? true);
      setCanPlay(json.canPlay ?? false);
      setVisitor(!json.signedIn);
      setIneligible(!!json.signedIn && !json.canPlay);
    } catch {
      setVisitor(true);
    }
  }, []);

  const loadPractice = useCallback(async () => {
    try {
      const res = await fetch("/api/quiz/tutorial");
      const json = res.ok ? await res.json() : null;
      if (json?.questions?.length) setPractice({ questions: json.questions, curve: json.curve });
    } catch {
      setPractice(null);
    }
  }, []);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.all([loadMine(), loadPractice()]).finally(() => setLoading(false));
  }, [loadMine, loadPractice]);

  useEffect(() => {
    loadStandings();
  }, [loadStandings]);

  useEffect(() => {
    if (!chosen && wasChosen.current) loadMine();
    wasChosen.current = !!chosen;
  }, [chosen, loadMine]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    goAfterAuthChange(router, "/");
  }
  useInactivityLogout(IDLE_TIMEOUT_MS, logout, !loading);

  const backHref = safeNextPath(from, visitor ? "/" : "/home");
  const here = quizPath(from, chosen);
  const membershipHref = withFrom("/membership", here);

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

  if (mine.length === 0 && (visitor || ineligible)) {
    return (
      <QuizLocked
        backHref={backHref}
        message={visitor ? texts.visitorNoCompetitions : texts.ineligible}
        action={
          visitor ? (
            <CreateAccountAction href={membershipHref} />
          ) : (
            <button onClick={() => router.push("/home")} className="btn btn-primary">
              {texts.backHome}
            </button>
          )
        }
      />
    );
  }

  if (tutorial && practice) {
    return (
      <TutorialQuiz
        questions={practice.questions}
        curve={practice.curve}
        confirm={confirmAnswers}
        onExit={() => setTutorial(false)}
      />
    );
  }

  if (chosen && standings?.running && standings.competitionId === chosen) {
    return (
      <CompetitionView
        standings={standings}
        canPlay={canPlay}
        visitor={visitor}
        membershipHref={membershipHref}
        backHref={quizPath(from, null)}
        onReloadStandings={loadStandings}
      />
    );
  }

  return (
    <QuizPicker
      competitions={mine}
      backHref={backHref}
      onPick={(id) => router.push(quizPath(from, id))}
      onTutorial={practice ? () => setTutorial(true) : undefined}
      tutorialCount={practice?.questions.length ?? 0}
      hint={canPlay ? undefined : visitor ? texts.visitorHint : texts.ineligibleHint}
      onStarted={loadMine}
    />
  );
}
