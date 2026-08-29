"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { isVoteClosed, mvpWinner } from "@/lib/mvpVote";
import { countdownLabel } from "@/lib/voteCountdown";
import { mvpVote as texts } from "@/lib/texts";
import type { MvpVote } from "./types";

export default function MvpVoteResults({
  matchId,
  vote,
  defaultMinutes,
  onChange,
}: {
  matchId: string;
  vote: MvpVote;
  defaultMinutes: number;
  onChange: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const closed = isVoteClosed(vote);
  const countdown = closed ? null : countdownLabel(vote.closesAt);
  const total = vote.candidates.reduce((sum, c) => sum + c._count.votes, 0);
  const winner = closed
    ? mvpWinner(vote.candidates.map((c) => ({ memberId: c.memberId, votes: c._count.votes })))
    : null;
  const tied = closed && total > 0 && winner === null;

  async function send(body: Record<string, unknown>) {
    setLoading(true);
    try {
      await api.patch(`/api/admin/matches/${matchId}/mvp-vote`, body);
      onChange();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!confirm(texts.confirmRemove)) return;
    setLoading(true);
    try {
      await api.del(`/api/admin/matches/${matchId}/mvp-vote`);
      onChange();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--mint-100)" }}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`badge ${closed ? "badge-pending" : "badge-active"}`}>
          {closed ? texts.closed : texts.open}
        </span>
        {countdown && (
          <span className="text-xs font-bold" style={{ color: "var(--mint-700)" }}>
            {texts.closesIn(countdown)}
          </span>
        )}
        <div className="flex gap-1.5">
          <button
            onClick={() => send(closed ? { status: "OPEN" } : { status: "CLOSED" })}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded-lg font-bold"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            {closed ? texts.reopen : texts.close}
          </button>
          <button
            onClick={() => send({ minutes: defaultMinutes })}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded-lg font-bold"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            {texts.extend}
          </button>
          <button
            onClick={remove}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded-lg font-bold"
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            {texts.remove}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        {vote.candidates
          .slice()
          .sort((a, b) => b._count.votes - a._count.votes)
          .map((c) => {
            const pct = total > 0 ? Math.round((c._count.votes / total) * 100) : 0;
            return (
              <div key={c.id}>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span style={{ color: "var(--text-main)" }}>{c.member.fullName}</span>
                  <span style={{ color: "var(--text-muted)" }}>
                    {c._count.votes} ({pct}%)
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--mint-100)" }}
                >
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${pct}%`, background: "var(--mint-600)" }}
                  />
                </div>
              </div>
            );
          })}
      </div>

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {texts.totalVotes(total)}
      </p>
      {tied && (
        <p className="text-xs font-semibold" style={{ color: "#92400e" }}>
          {texts.tie}
        </p>
      )}
    </div>
  );
}
