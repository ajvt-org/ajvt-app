"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, errorMessage } from "@/lib/api";
import { loginPathWithNext } from "@/lib/utils";
import IconLabel from "@/components/IconLabel";
import type { IconName } from "@/components/Icon";
import PageLoading from "@/components/PageLoading";
import WaitingRequests from "./WaitingRequests";
import { counted } from "@/lib/arabicCount";
import { ACTIVE_MEMBER, REQUEST, SETTLED } from "@/lib/messages";

export interface HomeSummary {
  year: number;
  membership: { paid: number; active: number; behind: number };
  money: { revenue: number; spending: number; net: number };
  handling: {
    pendingMembers: number;
    pendingRegistrations: number;
    pendingPayments: number;
    total: number;
  };
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
      <Answer
        href="/admin/dashboard?standing=paid"
        icon="check"
        question={`من سدد عضوية ${summary.year}`}
        headline={`${membership.paid} / ${membership.active}`}
        detail={`${counted(membership.paid, SETTLED)} من ${counted(membership.active, ACTIVE_MEMBER)}`}
      />
      <Answer
        href="/admin/expenses"
        icon="banknote"
        question="ما دخل وما خرج"
        headline={`${money.net} أوقية`}
        detail={`دخل ${money.revenue} أوقية، صرف ${money.spending} أوقية`}
        tone={money.net < 0 ? "var(--danger)" : undefined}
      />
      <Answer
        href="/admin/dashboard?status=PENDING"
        icon="clock"
        question="ما ينتظر البت فيه"
        headline={counted(handling.total, REQUEST)}
        detail={`عضويات ${handling.pendingMembers}، أنشطة ${handling.pendingRegistrations}، دفعات ${handling.pendingPayments}`}
        tone={handling.total > 0 ? "var(--mint-700)" : undefined}
      />
      <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
        الإصدار {process.env.RELEASE}
      </p>
    </div>
  );
}
