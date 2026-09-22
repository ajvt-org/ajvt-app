"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import HeaderIdentity from "@/components/HeaderIdentity";
import { electionState } from "@/lib/election";
import { electionMember as texts, electionStateLabels } from "@/lib/texts";
import { withFrom } from "@/lib/backLink";
import ElectionClock from "./ElectionClock";
import type { MemberElection } from "./electionTypes";

const HERE = "/elections";

const CHIP = {
  upcoming: { border: "1px solid var(--mint-200)", color: "var(--text-muted)" },
  open: {
    background: "linear-gradient(135deg, var(--mint-600), var(--mint-700))",
    color: "#ffffff",
  },
  ended: { background: "var(--mint-50)", color: "var(--text-muted)" },
} as const;

function ElectionRow({ election, onReached }: { election: MemberElection; onReached: () => void }) {
  const state = electionState(election);

  return (
    <Link href={withFrom(`/elections/${election.id}`, HERE)} className="card p-4 block space-y-2">
      <div className="flex items-start gap-2 flex-wrap">
        <span className="activity-title min-w-0 flex-1" style={{ color: "var(--text-main)" }}>
          {election.title}
        </span>
        <span
          className="shrink-0 rounded-full font-black"
          style={{ padding: "1px 10px", fontSize: 10, ...CHIP[state] }}
        >
          {electionStateLabels[state]}
        </span>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <ElectionClock election={election} onReached={onReached} compact />
        {election.voted && (
          <span
            className="flex items-center gap-1 text-xs font-bold"
            style={{ color: "var(--mint-600)" }}
          >
            <Icon name="check" size={13} />
            {texts.voted}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function ElectionsList({
  elections,
  backHref,
  onReached,
}: {
  elections: MemberElection[];
  backHref: string;
  onReached: () => void;
}) {
  return (
    <div className="app-shell">
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, var(--mint-900), var(--mint-700))",
          borderRadius: "0 0 28px 28px",
          padding: "16px 20px 44px",
        }}
      >
        <div className="relative flex items-center gap-3">
          <HeaderIdentity title={texts.listTitle} backHref={backHref} large />
        </div>
      </div>

      <div className="px-5 pb-10 space-y-3 relative" style={{ marginTop: -24 }}>
        {elections.length === 0 && (
          <div className="card p-6 text-center space-y-2">
            <div className="flex justify-center" style={{ color: "var(--mint-500)" }}>
              <Icon name="ballot" size={36} />
            </div>
            <p className="font-semibold" style={{ color: "var(--text-main)" }}>
              {texts.empty}
            </p>
          </div>
        )}

        {elections.map((election) => (
          <ElectionRow key={election.id} election={election} onReached={onReached} />
        ))}
      </div>
    </div>
  );
}
