"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, errorMessage } from "@/lib/api";
import { loginPathWithNext } from "@/lib/utils";
import IconLabel from "@/components/IconLabel";
import type { IconName } from "@/components/Icon";
import PageLoading from "@/components/PageLoading";
import Scoreline from "@/components/tournament/Scoreline";
import WaitingRequests from "./WaitingRequests";
import { counted } from "@/lib/arabicCount";
import { ACTIVE_MEMBER, REQUEST } from "@/lib/messages";
import { adminHome as texts } from "@/lib/texts";
import { formatMatchTime } from "@/lib/clubTime";
import { teamName } from "@/lib/fixtureTeams";

export interface HomeMatch {
  id: string;
  matchDate: string | null;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  activity: { id: string; title: string };
  homeTeam: { name: string } | null;
  awayTeam: { name: string } | null;
}

export interface HomeSummary {
  year: number;
  membership: { current: number; active: number; former: number };
  money: { revenue: number; spending: number; net: number };
  handling: {
    pendingMembers: number;
    pendingRegistrations: number;
    pendingPayments: number;
    total: number;
  };
  matchesToday: HomeMatch[];
}

function Answer({
  href,
  icon,
  question,
  headline,
  detail,
  tone,
}: {
  href: string;
  icon: IconName;
  question: string;
  headline: string;
  detail: string;
  tone?: string;
}) {
  return (
    <Link href={href} className="card p-4 block">
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        <IconLabel name={icon}>{question}</IconLabel>
      </p>
      <p className="text-2xl font-bold mt-1" style={{ color: tone ?? "var(--text-main)" }}>
        {headline}
      </p>
      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
        {detail}
      </p>
    </Link>
  );
}

export default function AdminHome() {
  const router = useRouter();
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api
      .get<HomeSummary>("/api/admin/home")
      .then((data) => {
        if (alive) setSummary(data);
      })
      .catch((e) => {
        if (!alive) return;
        const status = e instanceof ApiError ? e.status : 0;
        if (status === 401) {
          router.replace(loginPathWithNext("/admin/login"));
          return;
        }
        if (status === 403) {
          router.replace("/admin/activities");
          return;
        }
        setError(errorMessage(e));
      });
    return () => {
      alive = false;
    };
  }, [router]);

  if (error) {
    return (
      <div className="p-4">
        <p className="card p-4 text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      </div>
    );
  }

  if (!summary) return <PageLoading />;

  const { membership, money, handling } = summary;

  return (
    <div className="p-4 flex flex-col gap-3">
      <WaitingRequests />
      {summary.matchesToday.length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
            <IconLabel name="swords">{texts.matchesToday}</IconLabel>
          </p>
          <div className="mt-2 space-y-2">
            {summary.matchesToday.map((m) => (
              <Link
                key={m.id}
                href={`/admin/activities/${m.activity.id}?tab=matches`}
                className="flex items-center justify-between gap-2 text-sm"
                style={{ color: "var(--text-main)" }}
              >
                <span className="min-w-0 truncate font-semibold">
                  <bdi>{teamName(m.homeTeam)}</bdi>{" "}
                  {m.status === "PLAYED" ? (
                    <Scoreline home={m.homeScore} away={m.awayScore} />
                  ) : (
                    <span>×</span>
                  )}{" "}
                  <bdi>{teamName(m.awayTeam)}</bdi>
                </span>
                <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                  {m.activity.title}
                  {m.matchDate ? (
                    <>
                      {" "}
                      · <span dir="ltr">{formatMatchTime(m.matchDate)}</span>
                    </>
                  ) : null}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
      <Answer
        href="/admin/dashboard?standing=current"
        icon="check"
        question={texts.renewedQuestion(summary.year)}
        headline={`${membership.current} / ${membership.active}`}
        detail={texts.renewedDetail(membership.current, counted(membership.active, ACTIVE_MEMBER))}
      />
      <Answer
        href="/admin/expenses"
        icon="banknote"
        question={texts.moneyQuestion}
        headline={texts.ouguiya(money.net)}
        detail={texts.moneyDetail(money.revenue, money.spending)}
        tone={money.net < 0 ? "var(--danger)" : undefined}
      />
      <Answer
        href="/admin/dashboard?status=PENDING"
        icon="clock"
        question={texts.pendingQuestion}
        headline={counted(handling.total, REQUEST)}
        detail={texts.pendingDetail(
          handling.pendingMembers,
          handling.pendingRegistrations,
          handling.pendingPayments,
        )}
        tone={handling.total > 0 ? "var(--mint-700)" : undefined}
      />
      <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
        {texts.version} {process.env.RELEASE}
      </p>
    </div>
  );
}
