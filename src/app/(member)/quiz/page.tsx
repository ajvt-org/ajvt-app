"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useInactivityLogout } from "@/lib/useInactivityLogout";
import PageHeader from "@/components/PageHeader";
import Icon from "@/components/Icon";
import { goAfterAuthChange } from "@/lib/authNav";
import AssignmentsView from "./AssignmentsView";
import CompetitionView, { type StandingsState } from "./CompetitionView";
import QuizLocked, { CreateAccountAction } from "./QuizLocked";
import type { QuizMeData } from "./types";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export default function QuizPage() {
  const router = useRouter();

  const [data, setData] = useState<QuizMeData | null>(null);
  const [standings, setStandings] = useState<StandingsState | null>(null);
  const [ineligible, setIneligible] = useState(false);
  const [visitor, setVisitor] = useState(false);
  const [loading, setLoading] = useState(true);

  function loadData() {
    return fetch("/api/quiz/me")
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
        if (json) setData(json);
      })
      .catch(() => setVisitor(true));
  }

  function loadStandings() {
    return fetch("/api/quiz/standings")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json) setStandings(json);
      })
      .catch(() => {});
  }

  useEffect(() => {
    Promise.all([loadData(), loadStandings()]).finally(() => setLoading(false));
  }, []);

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
        message="أنشئ حساباً وأكمل استمارة الانضمام للمشاركة في المسابقة الثقافية."
        action={<CreateAccountAction />}
      />
    );
  }

  if (ineligible) {
    return (
      <QuizLocked
        backHref={backHref}
        message="يجب أن تكون منتسباً مقبولاً وقد دفعت رسوم الانتساب لتتمكن من المشاركة في المسابقة الثقافية."
        action={
          <button onClick={() => router.push("/home")} className="btn btn-primary">
            العودة للرئيسية
          </button>
        }
      />
    );
  }

  if (standings?.running) {
    return (
      <CompetitionView
        standings={standings}
        backHref={backHref}
        onReloadStandings={loadStandings}
      />
    );
  }

  if (!data) {
    return (
      <div className="app-shell">
        <PageHeader title="المسابقة الثقافية" backHref={backHref} />
      </div>
    );
  }

  return <AssignmentsView data={data} backHref={backHref} onReload={loadData} />;
}
