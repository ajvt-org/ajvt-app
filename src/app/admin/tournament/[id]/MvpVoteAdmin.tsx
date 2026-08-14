"use client";

import { useState } from "react";
import type { Match, Team } from "./types";

export default function MvpVoteAdmin({
  match,
  teams,
  onChange,
}: {
  match: Match;
  teams: Team[];
  onChange: () => void;
}) {
  const roster = [
    ...(teams.find((t) => t.id === match.homeTeam.id)?.members.map((m) => m.member) || []),
    ...(teams.find((t) => t.id === match.awayTeam.id)?.members.map((m) => m.member) || []),
  ];
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleCandidate(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 6 ? prev : [...prev, id],
    );
  }

  async function createVote() {
    if (selected.length < 2) {
      setError("اختر لاعبين على الأقل");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/matches/${match.id}/mvp-vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateMemberIds: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(status: "OPEN" | "CLOSED") {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/matches/${match.id}/mvp-vote`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("فشلت العملية");
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function deleteVote() {
    if (!confirm("حذف هذا التصويت نهائياً؟ ستُحذف كل الأصوات المسجَّلة.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/matches/${match.id}/mvp-vote`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشلت العملية");
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }

  if (!match.mvpVote) {
    if (roster.length < 2) {
      return (
        <p
          className="text-xs mt-3 pt-3"
          style={{ color: "var(--text-muted)", borderTop: "1px solid var(--mint-100)" }}
        >
          يحتاج الفريقان إلى لاعبين مسجَّلين في التشكيلة لبدء التصويت
        </p>
      );
    }
    return (
      <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--mint-100)" }}>
        <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
          اختر 2 إلى 6 مرشحين لأفضل لاعب في المباراة
        </p>
        <div className="flex flex-wrap gap-1.5">
          {roster.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => toggleCandidate(m.id)}
              className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
              style={{
                background: selected.includes(m.id) ? "var(--mint-600)" : "var(--mint-100)",
                color: selected.includes(m.id) ? "white" : "var(--mint-700)",
              }}
            >
              {m.fullName}
            </button>
          ))}
        </div>
        {error && (
          <p className="text-xs" style={{ color: "#dc2626" }}>
            {error}
          </p>
        )}
        <button
          onClick={createVote}
          disabled={loading || selected.length < 2}
          className="btn btn-primary text-xs px-3"
          style={{ width: "auto" }}
        >
          {loading ? "..." : `🌟 بدء التصويت (${selected.length})`}
        </button>
      </div>
    );
  }

  const totalVotes = match.mvpVote.candidates.reduce((s, c) => s + c._count.votes, 0);
  const open = match.mvpVote.status === "OPEN";

  return (
    <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--mint-100)" }}>
      <div className="flex items-center justify-between">
        <span className={`badge ${open ? "badge-active" : "badge-pending"}`}>
          {open ? "التصويت مفتوح" : "التصويت مغلق"}
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={() => setStatus(open ? "CLOSED" : "OPEN")}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded-lg font-bold"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            {open ? "إغلاق التصويت" : "إعادة فتحه"}
          </button>
          <button
            onClick={deleteVote}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded-lg font-bold"
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            حذف
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        {match.mvpVote.candidates
          .slice()
          .sort((a, b) => b._count.votes - a._count.votes)
          .map((c) => {
            const pct = totalVotes > 0 ? Math.round((c._count.votes / totalVotes) * 100) : 0;
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
        مجموع الأصوات: {totalVotes}
      </p>
    </div>
  );
}
