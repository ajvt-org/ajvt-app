"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { api, errorMessage } from "@/lib/api";
import ArrowLabel from "@/components/ArrowLabel";

interface Candidate {
  id: string;
  fullName: string;
  voteCount: number;
}

interface MvpVoteWidgetProps {
  matchId: string;
  status: "OPEN" | "CLOSED";
  candidates: Candidate[];
  loggedIn: boolean;
  initialMyVoteCandidateId: string | null;
}

export default function MvpVoteWidget({
  matchId,
  status,
  candidates,
  loggedIn,
  initialMyVoteCandidateId,
}: MvpVoteWidgetProps) {
  const [myVote, setMyVote] = useState(initialMyVoteCandidateId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const showToast = useToast();

  async function castVote(candidateId: string) {
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/matches/${matchId}/mvp-vote`, { candidateId });
      setMyVote(candidateId);
      showToast("تم تسجيل صوتك");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const closed = status === "CLOSED";
  const totalVotes = candidates.reduce((s, c) => s + c.voteCount, 0);
  const topVoteCount = closed ? Math.max(0, ...candidates.map((c) => c.voteCount)) : 0;

  return (
    <div className="mt-2.5 pt-2.5" style={{ borderTop: "1px dashed var(--mint-200)" }}>
      <p className="text-xs font-bold mb-1.5" style={{ color: "var(--mint-700)" }}>
        🌟 {closed ? "نتيجة تصويت أفضل لاعب" : "صوّت لأفضل لاعب في المباراة"}
      </p>

      {closed ? (
        <div className="space-y-1.5">
          {candidates
            .slice()
            .sort((a, b) => b.voteCount - a.voteCount)
            .map((c) => {
              const pct = totalVotes > 0 ? Math.round((c.voteCount / totalVotes) * 100) : 0;
              const isWinner = totalVotes > 0 && c.voteCount === topVoteCount;
              return (
                <div key={c.id}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span style={{ color: "var(--text-main)", fontWeight: isWinner ? 700 : 400 }}>
                      {isWinner ? "🏅 " : ""}
                      {c.fullName}
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>
                      {c.voteCount} ({pct}%)
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: "var(--mint-100)" }}
                  >
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: isWinner ? "var(--copper-500)" : "var(--mint-500)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      ) : !loggedIn ? (
        <div>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {candidates.map((c) => (
              <span key={c.id} className="badge badge-pending">
                {c.fullName}
              </span>
            ))}
          </div>
          <a href="/login" className="text-xs font-semibold" style={{ color: "var(--mint-600)" }}>
            <ArrowLabel>سجّل الدخول للتصويت</ArrowLabel>
          </a>
        </div>
      ) : myVote ? (
        <p className="text-xs font-semibold" style={{ color: "var(--mint-600)" }}>
          ✅ صوّتَّ لـ {candidates.find((c) => c.id === myVote)?.fullName}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {candidates.map((c) => (
            <button
              key={c.id}
              onClick={() => castVote(c.id)}
              disabled={busy}
              className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
              style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
            >
              {c.fullName}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs mt-1" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
    </div>
  );
}
