"use client";

import Link from "next/link";
import ArrowLabel from "@/components/ArrowLabel";
import Icon, { type IconName } from "@/components/Icon";
import { membershipState, type MembershipState } from "@/lib/membershipState";
import { membershipStanding as texts } from "@/lib/texts";
import type { MemberData } from "@/lib/useMember";

type Tone = Exclude<MembershipState, "UP_TO_DATE">;

const TONES: Record<Tone, { icon: IconName; bg: string; border: string; ink: string }> = {
  NO_PAYMENT: { icon: "wallet", bg: "var(--mint-50)", border: "var(--mint-200)", ink: "#047857" },
  AWAITING_REVIEW: { icon: "clock", bg: "#fef9ee", border: "#fcd34d", ink: "#b45309" },
  REFUSED: { icon: "close", bg: "#fff5f5", border: "#fca5a5", ink: "#b91c1c" },
  BEHIND: { icon: "hourglass", bg: "#fef9ee", border: "#fcd34d", ink: "#b45309" },
};

export default function MembershipStanding({
  member,
  currentYear,
}: {
  member: MemberData | null;
  currentYear: number | null;
}) {
  if (currentYear === null) return null;

  const state = membershipState(member, currentYear);
  if (state === "UP_TO_DATE") return null;

  const tone = TONES[state];

  return (
    <div
      className="card p-4 fade-up"
      style={{ background: tone.bg, border: `1.5px solid ${tone.border}` }}
    >
      <div className="flex items-start gap-3">
        <span
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.7)", color: tone.ink }}
        >
          <Icon name={tone.icon} size={22} />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <h2 className="font-black text-sm" style={{ color: "var(--text-main)" }}>
            {title(state, member, currentYear)}
          </h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {body(state, member, currentYear)}
          </p>
          {state === "REFUSED" && member?.rejectionReason && (
            <p className="text-xs font-bold" style={{ color: tone.ink }}>
              {texts.refused.reasonLabel}: {member.rejectionReason}
            </p>
          )}
          {state === "NO_PAYMENT" && (
            <StandingLink href="/membership">{texts.noPayment.action}</StandingLink>
          )}
          {state === "REFUSED" && member && (
            <StandingLink href={`/membership?id=${member.id}`}>{texts.refused.action}</StandingLink>
          )}
        </div>
      </div>
    </div>
  );
}

function title(state: Tone, member: MemberData | null, currentYear: number): string {
  if (state === "NO_PAYMENT") return texts.noPayment.title;
  if (state === "AWAITING_REVIEW") return texts.awaitingReview.title;
  if (state === "REFUSED") return texts.refused.title;
  return texts.behind.title(member?.membershipYear ?? currentYear);
}

function body(state: Tone, member: MemberData | null, currentYear: number): string {
  if (state === "NO_PAYMENT") return texts.noPayment.body;
  if (state === "AWAITING_REVIEW") return texts.awaitingReview.body;
  if (state === "REFUSED") return texts.refused.body;
  return texts.behind.body(currentYear);
}

function StandingLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="inline-flex text-xs font-bold px-3 py-2 rounded-lg mt-1"
      style={{ background: "var(--mint-600)", color: "white" }}
    >
      <ArrowLabel>{children}</ArrowLabel>
    </Link>
  );
}
