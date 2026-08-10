"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { groupStandings, computeTopScorers, computeStats, getHeadToHead, type StandingsRow, type TopScorerRow } from "@/lib/tournament";

interface RosterMember {
  id: string;
  fullName: string;
  phone: string;
  age: string;
  team: { id: string; name: string } | null;
}

interface Group {
  id: string;
  name: string;
}

interface TeamMemberEntry {
  member: { id: string; fullName: string; phone: string; age: string };
}

interface Team {
  id: string;
  name: string;
  groupId: string | null;
  group: Group | null;
  members: TeamMemberEntry[];
}

interface MatchGoal {
  id: string;
  count: number;
  teamId: string;
  member: { id: string; fullName: string };
}

interface MatchBooking {
  id: string;
  cardType: "YELLOW" | "RED";
  minute: number | null;
  teamId: string;
  member: { id: string; fullName: string };
}

interface MvpCandidate {
  id: string;
  memberId: string;
  member: { id: string; fullName: string };
  _count: { votes: number };
}

interface MvpVote {
  id: string;
  status: "OPEN" | "CLOSED";
  candidates: MvpCandidate[];
}

interface Match {
  id: string;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  matchDate: string | null;
  round: string | null;
  venue: string | null;
  isKnockout: boolean;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  manOfTheMatch: { id: string; fullName: string } | null;
  status: "SCHEDULED" | "PLAYED";
  goals: MatchGoal[];
  bookings: MatchBooking[];
  mvpVote: MvpVote | null;
}

type Tab = "teams" | "matches" | "standings" | "scorers";

export default function TournamentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const activityId = params.id;
  const title = searchParams.get("title") || "البطولة";

  const [tab, setTab] = useState<Tab>("teams");
  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState("");

  async function loadAll() {
    try {
      const [rosterRes, groupsRes, teamsRes, matchesRes] = await Promise.all([
        fetch(`/api/admin/activities/${activityId}/roster`),
        fetch(`/api/admin/activities/${activityId}/groups`),
        fetch(`/api/admin/activities/${activityId}/teams`),
        fetch(`/api/admin/activities/${activityId}/matches`),
      ]);
      if ([rosterRes, groupsRes, teamsRes, matchesRes].some((r) => r.status === 401)) {
        router.push("/admin/login");
        return;
      }
      const rosterData = await rosterRes.json();
      const groupsData = await groupsRes.json();
      const teamsData = await teamsRes.json();
      const matchesData = await matchesRes.json();
      setRoster(rosterData.roster || []);
      setGroups(groupsData.groups || []);
      setTeams(teamsData.teams || []);
      setMatches(matchesData.matches || []);
    } catch {
      setError("فشل تحميل بيانات البطولة");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial fetch on mount — loadAll is also called directly from child
    // tabs after mutations (team/match changes) to refresh this page's state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const standingsByGroup = useMemo(() => groupStandings(teams, matches), [teams, matches]);
  const topScorers = useMemo(() => computeTopScorers(teams, matches), [matches, teams]);
  const stats = useMemo(() => computeStats(teams, matches), [teams, matches]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-pulse" style={{ color: "var(--mint-500)" }}>⏳</div>
      </div>
    );
  }

  return (
    <div>
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/activities")}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            ←
          </button>
          <div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>⚽ إدارة البطولة</p>
            <p className="text-sm font-black text-white leading-none">{title}</p>
          </div>
        </div>
        <a
          href={`/tournament/${activityId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded-lg font-semibold"
          style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}
        >
          🌐 الصفحة العامة
        </a>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {error && (
          <div className="p-3 rounded-xl text-sm font-semibold mb-4" style={{ background: "#fee2e2", color: "#991b1b" }}>
            ⚠️ {error}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 mb-5">
          {([
            ["teams", "الفرق"],
            ["matches", "المباريات"],
            ["standings", "الترتيب"],
            ["scorers", "الهدافون"],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="rounded-xl py-2.5 text-center text-sm font-bold transition-all"
              style={{
                background: tab === key ? "var(--mint-700)" : "white",
                color: tab === key ? "white" : "var(--text-main)",
                border: tab === key ? "none" : "1px solid var(--mint-100)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "teams" && (
          <TeamsTab
            activityId={activityId}
            teams={teams}
            groups={groups}
            roster={roster}
            onChange={loadAll}
          />
        )}
        {tab === "matches" && (
          <MatchesTab activityId={activityId} teams={teams} matches={matches} onChange={loadAll} />
        )}
        {tab === "standings" && (
          <StandingsTab title={title} standingsByGroup={standingsByGroup} groups={groups} stats={stats} matches={matches} />
        )}
        {tab === "scorers" && <ScorersTab topScorers={topScorers} />}
      </div>
    </div>
  );
}

function TeamsTab({
  activityId,
  teams,
  groups,
  roster,
  onChange,
}: {
  activityId: string;
  teams: Team[];
  groups: Group[];
  roster: RosterMember[];
  onChange: () => void;
}) {
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamGroup, setNewTeamGroup] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Record<string, string>>({});

  const unassigned = roster.filter((m) => !m.team);

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/activities/${activityId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setNewGroupName("");
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoadingAction(false);
    }
  }

  async function deleteGroup(groupId: string) {
    if (!confirm("حذف هذه المجموعة؟ ستبقى الفرق لكن بدون تصنيف.")) return;
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/groups/${groupId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشلت العملية");
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoadingAction(false);
    }
  }

  async function setTeamGroup(teamId: string, groupId: string) {
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: groupId || null }),
      });
      if (!res.ok) throw new Error("فشلت العملية");
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoadingAction(false);
    }
  }

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/activities/${activityId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName, groupId: newTeamGroup || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setNewTeamName("");
      setNewTeamGroup("");
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoadingAction(false);
    }
  }

  async function deleteTeam(teamId: string) {
    if (!confirm("هل تريد حذف هذا الفريق؟")) return;
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشلت العملية");
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoadingAction(false);
    }
  }

  async function addMember(teamId: string) {
    const memberId = selectedMember[teamId];
    if (!memberId) return;
    setError("");
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setSelectedMember((p) => ({ ...p, [teamId]: "" }));
      setAddingTo(null);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoadingAction(false);
    }
  }

  async function removeMember(teamId: string, memberId: string) {
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/members/${memberId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشلت العملية");
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoadingAction(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-xl text-sm font-semibold" style={{ background: "#fee2e2", color: "#991b1b" }}>
          ⚠️ {error}
        </div>
      )}

      <div className="card p-4">
        <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>🗂️ المجموعات (اختياري — للبطولات بنظام الدوري ثم خروج المغلوب)</p>
        {groups.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {groups.map((g) => (
              <span key={g.id} className="badge badge-pending flex items-center gap-1.5">
                {g.name}
                <button onClick={() => deleteGroup(g.id)} className="font-bold" style={{ color: "#991b1b" }}>✕</button>
              </span>
            ))}
          </div>
        )}
        <form onSubmit={createGroup} className="flex gap-2">
          <input
            type="text"
            placeholder="اسم مجموعة جديدة (مثال: المجموعة أ)"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            maxLength={40}
            className="input flex-1 text-sm"
          />
          <button type="submit" disabled={!newGroupName.trim() || loadingAction} className="btn btn-primary text-xs px-3" style={{ width: "auto" }}>
            إضافة
          </button>
        </form>
      </div>

      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>عدد الفرق: {teams.length}</p>

      {teams.map((team) => (
        <div key={team.id} className="card p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="font-bold" style={{ color: "var(--text-main)" }}>{team.name}</p>
            <button
              onClick={() => deleteTeam(team.id)}
              disabled={loadingAction}
              className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              🗑 حذف الفريق
            </button>
          </div>

          {groups.length > 0 && (
            <select
              value={team.groupId || ""}
              onChange={(e) => setTeamGroup(team.id, e.target.value)}
              className="input text-sm mb-2"
            >
              <option value="">بدون مجموعة</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}

          <div className="space-y-1.5 mb-2">
            {team.members.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>لا يوجد لاعبون بعد</p>
            ) : (
              team.members.map(({ member }) => (
                <div key={member.id} className="flex items-center justify-between text-sm">
                  <span style={{ color: "var(--text-main)" }}>{member.fullName}</span>
                  <button
                    onClick={() => removeMember(team.id, member.id)}
                    className="text-xs px-2 py-1 rounded-lg font-bold"
                    style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                  >
                    إزالة
                  </button>
                </div>
              ))
            )}
          </div>

          {addingTo === team.id ? (
            <div className="flex gap-2">
              <select
                value={selectedMember[team.id] || ""}
                onChange={(e) => setSelectedMember((p) => ({ ...p, [team.id]: e.target.value }))}
                className="input flex-1"
              >
                <option value="">اختر لاعباً...</option>
                {unassigned.map((m) => (
                  <option key={m.id} value={m.id}>{m.fullName}</option>
                ))}
              </select>
              <button
                onClick={() => addMember(team.id)}
                disabled={!selectedMember[team.id] || loadingAction}
                className="btn btn-primary text-xs px-3"
                style={{ width: "auto" }}
              >
                إضافة
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingTo(team.id)}
              className="text-xs px-3 py-1.5 rounded-lg font-bold"
              style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
            >
              ➕ إضافة لاعب
            </button>
          )}
        </div>
      ))}

      <form onSubmit={createTeam} className="card p-4 space-y-2">
        <input
          type="text"
          placeholder="اسم الفريق الجديد"
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          maxLength={40}
          required
          className="input"
        />
        {groups.length > 0 && (
          <select value={newTeamGroup} onChange={(e) => setNewTeamGroup(e.target.value)} className="input">
            <option value="">بدون مجموعة</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        <button type="submit" disabled={loadingAction} className="btn btn-primary text-sm">
          {loadingAction ? "..." : "➕ فريق"}
        </button>
      </form>

      {unassigned.length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
            🧍 لاعبون غير مصنّفين ({unassigned.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unassigned.map((m) => (
              <span key={m.id} className="badge badge-pending">{m.fullName}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchesTab({
  activityId,
  teams,
  matches,
  onChange,
}: {
  activityId: string;
  teams: Team[];
  matches: Match[];
  onChange: () => void;
}) {
  const [form, setForm] = useState({ homeTeamId: "", awayTeamId: "", matchDate: "", round: "", venue: "", isKnockout: false });
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState("");
  const [resultFormFor, setResultFormFor] = useState<string | null>(null);
  const [cardsFor, setCardsFor] = useState<string | null>(null);
  const [mvpFor, setMvpFor] = useState<string | null>(null);

  async function createMatch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.homeTeamId || !form.awayTeamId) { setError("يجب اختيار الفريقين"); return; }
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/activities/${activityId}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setForm({ homeTeamId: "", awayTeamId: "", matchDate: "", round: "", venue: "", isKnockout: false });
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoadingAction(false);
    }
  }

  async function deleteMatch(matchId: string) {
    if (!confirm("هل تريد حذف هذه المباراة؟")) return;
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/matches/${matchId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشلت العملية");
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoadingAction(false);
    }
  }

  const scheduled = matches.filter((m) => m.status === "SCHEDULED");
  const played = matches.filter((m) => m.status === "PLAYED");

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-xl text-sm font-semibold" style={{ background: "#fee2e2", color: "#991b1b" }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={createMatch} className="card p-4 space-y-3">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>➕ مباراة جديدة</p>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.homeTeamId}
            onChange={(e) => setForm((p) => ({ ...p, homeTeamId: e.target.value }))}
            className="input"
          >
            <option value="">الفريق المضيف...</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select
            value={form.awayTeamId}
            onChange={(e) => setForm((p) => ({ ...p, awayTeamId: e.target.value }))}
            className="input"
          >
            <option value="">الفريق الضيف...</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={form.matchDate}
            onChange={(e) => setForm((p) => ({ ...p, matchDate: e.target.value }))}
            className="input"
          />
          <input
            type="text"
            placeholder="الجولة (اختياري)"
            value={form.round}
            onChange={(e) => setForm((p) => ({ ...p, round: e.target.value }))}
            maxLength={40}
            className="input"
          />
        </div>
        <input
          type="text"
          placeholder="الملعب (اختياري)"
          value={form.venue}
          onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))}
          maxLength={60}
          className="input"
        />
        <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-main)" }}>
          <input
            type="checkbox"
            checked={form.isKnockout}
            onChange={(e) => setForm((p) => ({ ...p, isKnockout: e.target.checked }))}
          />
          🏆 مباراة خروج المغلوب (لا تُحتسب في ترتيب المجموعات)
        </label>
        <button type="submit" disabled={loadingAction} className="btn btn-primary text-sm">
          {loadingAction ? "..." : "إضافة المباراة"}
        </button>
      </form>

      {scheduled.length > 0 && (
        <div>
          <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>📅 مباريات قادمة</p>
          <div className="space-y-3">
            {scheduled.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                teams={teams}
                allMatches={matches}
                onDelete={() => deleteMatch(m.id)}
                showResultForm={resultFormFor === m.id}
                onToggleResultForm={() => setResultFormFor((v) => (v === m.id ? null : m.id))}
                showCards={cardsFor === m.id}
                onToggleCards={() => setCardsFor((v) => (v === m.id ? null : m.id))}
                showMvp={mvpFor === m.id}
                onToggleMvp={() => setMvpFor((v) => (v === m.id ? null : m.id))}
                onSaved={() => { setResultFormFor(null); onChange(); }}
                onChange={onChange}
              />
            ))}
          </div>
        </div>
      )}

      {played.length > 0 && (
        <div>
          <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>✅ نتائج</p>
          <div className="space-y-3">
            {played.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                teams={teams}
                allMatches={matches}
                onDelete={() => deleteMatch(m.id)}
                showResultForm={resultFormFor === m.id}
                onToggleResultForm={() => setResultFormFor((v) => (v === m.id ? null : m.id))}
                showCards={cardsFor === m.id}
                onToggleCards={() => setCardsFor((v) => (v === m.id ? null : m.id))}
                showMvp={mvpFor === m.id}
                onToggleMvp={() => setMvpFor((v) => (v === m.id ? null : m.id))}
                onSaved={() => { setResultFormFor(null); onChange(); }}
                onChange={onChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const CARD_LABEL: Record<string, string> = { YELLOW: "🟨", RED: "🟥" };

function MatchCard({
  match,
  teams,
  allMatches,
  onDelete,
  showResultForm,
  onToggleResultForm,
  showCards,
  onToggleCards,
  showMvp,
  onToggleMvp,
  onSaved,
  onChange,
}: {
  match: Match;
  teams: Team[];
  allMatches: Match[];
  onDelete: () => void;
  showResultForm: boolean;
  onToggleResultForm: () => void;
  showCards: boolean;
  onToggleCards: () => void;
  showMvp: boolean;
  onToggleMvp: () => void;
  onSaved: () => void;
  onChange: () => void;
}) {
  const priorMeetings = getHeadToHead(allMatches, match.homeTeam.id, match.awayTeam.id, match.id);
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
            {match.homeTeam.name}
            {match.status === "PLAYED" ? ` ${match.homeScore} - ${match.awayScore} ` : " × "}
            {match.awayTeam.name}
            {match.homePenalties !== null && match.awayPenalties !== null && (
              <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                {" "}(ركلات ترجيح {match.homePenalties}-{match.awayPenalties})
              </span>
            )}
          </p>
          <div className="flex items-center gap-2 text-xs mt-1 flex-wrap" style={{ color: "var(--text-muted)" }}>
            {match.round && <span>{match.round}</span>}
            {match.venue && <span>📍 {match.venue}</span>}
            {match.matchDate && <span dir="ltr">{new Date(match.matchDate).toLocaleDateString("ar")}</span>}
            {match.isKnockout && <span className="badge badge-pending">إقصائية</span>}
          </div>
          {priorMeetings.length > 0 && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              🔁 مواجهات سابقة: {priorMeetings.map((pm) =>
                pm.status === "PLAYED" ? `${pm.homeScore}-${pm.awayScore}` : "قادمة"
              ).join("، ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleResultForm}
            className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            {match.status === "PLAYED" ? "تعديل النتيجة" : "أدخل النتيجة"}
          </button>
          <button
            onClick={onDelete}
            className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            🗑
          </button>
        </div>
      </div>

      {match.status === "PLAYED" && match.goals.length > 0 && (
        <div className="mt-2 pt-2 flex flex-wrap gap-1.5" style={{ borderTop: "1px solid var(--mint-100)" }}>
          {match.goals.map((g) => (
            <span key={g.id} className="badge badge-active">⚽ {g.member.fullName} ({g.count})</span>
          ))}
        </div>
      )}

      {match.manOfTheMatch && (
        <p className="text-xs mt-2 font-semibold" style={{ color: "var(--mint-700)" }}>
          🌟 رجل المباراة: {match.manOfTheMatch.fullName}
        </p>
      )}

      {match.bookings.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {match.bookings.map((b) => (
            <span key={b.id} className="badge badge-rejected">
              {CARD_LABEL[b.cardType]} {b.member.fullName}{b.minute ? ` (${b.minute}')` : ""}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <button
          onClick={onToggleCards}
          className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
          style={{ background: "white", color: "var(--mint-700)", border: "1px solid var(--mint-200)" }}
        >
          {showCards ? "إخفاء البطاقات" : "🟨🟥 إدارة البطاقات"}
        </button>
        <button
          onClick={onToggleMvp}
          className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
          style={{ background: "white", color: "var(--mint-700)", border: "1px solid var(--mint-200)" }}
        >
          {showMvp ? "إخفاء التصويت" : "🌟 أفضل لاعب"}
        </button>
      </div>

      {showCards && <BookingsForm match={match} teams={teams} onChange={onChange} />}
      {showResultForm && <ResultForm match={match} teams={teams} onSaved={onSaved} />}
      {showMvp && <MvpVoteAdmin match={match} teams={teams} onChange={onChange} />}
    </div>
  );
}

function BookingsForm({ match, teams, onChange }: { match: Match; teams: Team[]; onChange: () => void }) {
  const [teamId, setTeamId] = useState(match.homeTeam.id);
  const [memberId, setMemberId] = useState("");
  const [cardType, setCardType] = useState<"YELLOW" | "RED">("YELLOW");
  const [minute, setMinute] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const roster = teams.find((t) => t.id === teamId)?.members.map((m) => m.member) || [];

  async function addBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!memberId) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/matches/${match.id}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, teamId, cardType, minute: minute || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setMemberId("");
      setMinute("");
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function removeBooking(bookingId: string) {
    setLoading(true);
    try {
      await fetch(`/api/admin/bookings/${bookingId}`, { method: "DELETE" });
      onChange();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--mint-100)" }}>
      {match.bookings.length > 0 && (
        <div className="space-y-1">
          {match.bookings.map((b) => (
            <div key={b.id} className="flex items-center justify-between text-xs">
              <span>{CARD_LABEL[b.cardType]} {b.member.fullName}{b.minute ? ` — الدقيقة ${b.minute}` : ""}</span>
              <button onClick={() => removeBooking(b.id)} className="font-bold" style={{ color: "#991b1b" }}>حذف</button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addBooking} className="flex flex-wrap gap-2 items-center">
        <select value={teamId} onChange={(e) => { setTeamId(e.target.value); setMemberId(""); }} className="input text-sm" style={{ width: "auto" }}>
          <option value={match.homeTeam.id}>{match.homeTeam.name}</option>
          <option value={match.awayTeam.id}>{match.awayTeam.name}</option>
        </select>
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="input text-sm flex-1">
          <option value="">اختر لاعباً...</option>
          {roster.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
        </select>
        <select value={cardType} onChange={(e) => setCardType(e.target.value as "YELLOW" | "RED")} className="input text-sm" style={{ width: "auto" }}>
          <option value="YELLOW">🟨</option>
          <option value="RED">🟥</option>
        </select>
        <input
          type="number"
          min={1}
          max={130}
          placeholder="الدقيقة"
          value={minute}
          onChange={(e) => setMinute(e.target.value)}
          className="input text-sm"
          style={{ width: "80px" }}
        />
        <button type="submit" disabled={!memberId || loading} className="btn btn-primary text-xs px-3" style={{ width: "auto" }}>
          إضافة
        </button>
      </form>
      {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
    </div>
  );
}

function MvpVoteAdmin({ match, teams, onChange }: { match: Match; teams: Team[]; onChange: () => void }) {
  const roster = [
    ...(teams.find((t) => t.id === match.homeTeam.id)?.members.map((m) => m.member) || []),
    ...(teams.find((t) => t.id === match.awayTeam.id)?.members.map((m) => m.member) || []),
  ];
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleCandidate(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 6 ? prev : [...prev, id]));
  }

  async function createVote() {
    if (selected.length < 2) { setError("اختر لاعبين على الأقل"); return; }
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
        <p className="text-xs mt-3 pt-3" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--mint-100)" }}>
          يحتاج الفريقان إلى لاعبين مسجَّلين في التشكيلة لبدء التصويت
        </p>
      );
    }
    return (
      <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--mint-100)" }}>
        <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>اختر 2 إلى 6 مرشحين لأفضل لاعب في المباراة</p>
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
        {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
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
        <span className={`badge ${open ? "badge-active" : "badge-pending"}`}>{open ? "التصويت مفتوح" : "التصويت مغلق"}</span>
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
                  <span style={{ color: "var(--text-muted)" }}>{c._count.votes} ({pct}%)</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--mint-100)" }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: "var(--mint-600)" }} />
                </div>
              </div>
            );
          })}
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>مجموع الأصوات: {totalVotes}</p>
    </div>
  );
}

function ResultForm({ match, teams, onSaved }: { match: Match; teams: Team[]; onSaved: () => void }) {
  const homeRoster = teams.find((t) => t.id === match.homeTeam.id)?.members.map((m) => m.member) || [];
  const awayRoster = teams.find((t) => t.id === match.awayTeam.id)?.members.map((m) => m.member) || [];
  const combinedRoster = [...homeRoster, ...awayRoster];
  const [homeScore, setHomeScore] = useState(match.homeScore?.toString() ?? "");
  const [awayScore, setAwayScore] = useState(match.awayScore?.toString() ?? "");
  const [homeGoals, setHomeGoals] = useState<{ memberId: string; count: string }[]>(
    match.goals.filter((g) => g.teamId === match.homeTeam.id).map((g) => ({ memberId: g.member.id, count: String(g.count) }))
  );
  const [awayGoals, setAwayGoals] = useState<{ memberId: string; count: string }[]>(
    match.goals.filter((g) => g.teamId === match.awayTeam.id).map((g) => ({ memberId: g.member.id, count: String(g.count) }))
  );
  const [homePenalties, setHomePenalties] = useState(match.homePenalties?.toString() ?? "");
  const [awayPenalties, setAwayPenalties] = useState(match.awayPenalties?.toString() ?? "");
  const [manOfTheMatchId, setManOfTheMatchId] = useState(match.manOfTheMatch?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scoresTied = homeScore !== "" && awayScore !== "" && homeScore === awayScore;
  const showPenalties = match.isKnockout && scoresTied;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
        homeGoals: homeGoals.filter((g) => g.memberId).map((g) => ({ memberId: g.memberId, count: Number(g.count) || 1 })),
        awayGoals: awayGoals.filter((g) => g.memberId).map((g) => ({ memberId: g.memberId, count: Number(g.count) || 1 })),
        manOfTheMatchId: manOfTheMatchId || null,
      };
      if (showPenalties && homePenalties !== "" && awayPenalties !== "") {
        body.homePenalties = Number(homePenalties);
        body.awayPenalties = Number(awayPenalties);
      }
      const res = await fetch(`/api/admin/matches/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-3 pt-3 space-y-3" style={{ borderTop: "1px solid var(--mint-100)" }}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{match.homeTeam.name}</label>
          <input type="number" min={0} value={homeScore} onChange={(e) => setHomeScore(e.target.value)} required className="input" />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{match.awayTeam.name}</label>
          <input type="number" min={0} value={awayScore} onChange={(e) => setAwayScore(e.target.value)} required className="input" />
        </div>
      </div>

      {showPenalties && (
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>ركلات الترجيح (النتيجة متعادلة — مباراة إقصائية)</p>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" min={0} placeholder="ركلات المضيف" value={homePenalties} onChange={(e) => setHomePenalties(e.target.value)} className="input" />
            <input type="number" min={0} placeholder="ركلات الضيف" value={awayPenalties} onChange={(e) => setAwayPenalties(e.target.value)} className="input" />
          </div>
        </div>
      )}

      <GoalRows
        label={`هدافو ${match.homeTeam.name} (اختياري)`}
        rows={homeGoals}
        setRows={setHomeGoals}
        teamMembers={homeRoster}
      />
      <GoalRows
        label={`هدافو ${match.awayTeam.name} (اختياري)`}
        rows={awayGoals}
        setRows={setAwayGoals}
        teamMembers={awayRoster}
      />

      <div>
        <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>🌟 رجل المباراة (اختياري)</label>
        <select value={manOfTheMatchId} onChange={(e) => setManOfTheMatchId(e.target.value)} className="input">
          <option value="">بدون</option>
          {combinedRoster.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
        </select>
      </div>

      {error && (
        <div className="p-2.5 rounded-xl text-xs font-semibold" style={{ background: "#fee2e2", color: "#991b1b" }}>
          ⚠️ {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn btn-primary text-sm">
        {loading ? "..." : "حفظ النتيجة"}
      </button>
    </form>
  );
}

function GoalRows({
  label,
  rows,
  setRows,
  teamMembers,
}: {
  label: string;
  rows: { memberId: string; count: string }[];
  setRows: (fn: (prev: { memberId: string; count: string }[]) => { memberId: string; count: string }[]) => void;
  teamMembers: { id: string; fullName: string }[];
}) {
  return (
    <div>
      <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>{label}</p>
      {teamMembers.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>لا يوجد لاعبون في هذا الفريق بعد</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2">
              <select
                value={row.memberId}
                onChange={(e) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, memberId: e.target.value } : r)))}
                className="input flex-1 text-sm"
              >
                <option value="">اختر لاعباً...</option>
                {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
              </select>
              <input
                type="number"
                min={1}
                value={row.count}
                onChange={(e) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, count: e.target.value } : r)))}
                className="input text-sm"
                style={{ width: "70px" }}
              />
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-xs px-2 rounded-lg font-bold"
                style={{ background: "#fee2e2", color: "#991b1b" }}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, { memberId: "", count: "1" }])}
            className="text-xs px-2.5 py-1 rounded-lg font-bold"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            ➕ إضافة هداف
          </button>
        </div>
      )}
    </div>
  );
}

function StandingsTab({
  title,
  standingsByGroup,
  groups,
  stats,
  matches,
}: {
  title: string;
  standingsByGroup: { groupId: string | null; standings: StandingsRow[] }[];
  groups: Group[];
  stats: ReturnType<typeof computeStats>;
  matches: Match[];
}) {
  const groupNameById = new Map(groups.map((g) => [g.id, g.name]));
  const hasAnyTeams = standingsByGroup.some((g) => g.standings.length > 0);
  const singleFlatTable = standingsByGroup.length === 1 && standingsByGroup[0].groupId === null;

  function exportCSV() {
    const rows: string[][] = [];
    rows.push(["الترتيب"]);
    for (const group of standingsByGroup) {
      if (!singleFlatTable) rows.push([group.groupId ? groupNameById.get(group.groupId) || "" : "بدون مجموعة"]);
      rows.push(["#", "الفريق", "لعب", "فاز", "تعادل", "خسر", "له", "عليه", "الفرق", "نقاط"]);
      group.standings.forEach((r, i) => {
        rows.push([String(i + 1), r.name, String(r.played), String(r.won), String(r.drawn), String(r.lost), String(r.gf), String(r.ga), String(r.gd), String(r.points)]);
      });
      rows.push([]);
    }
    rows.push(["النتائج"]);
    rows.push(["الجولة", "المضيف", "النتيجة", "الضيف", "الملعب", "التاريخ"]);
    matches.filter((m) => m.status === "PLAYED").forEach((m) => {
      rows.push([
        m.round || "",
        m.homeTeam.name,
        `${m.homeScore} - ${m.awayScore}`,
        m.awayTeam.name,
        m.venue || "",
        m.matchDate ? new Date(m.matchDate).toLocaleDateString("ar") : "",
      ]);
    });

    const csv = "﻿" + rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}-الترتيب-والنتائج.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!hasAnyTeams) {
    return <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>لا توجد فرق بعد</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <StatBox label="مباريات لُعبت" value={stats.matchesPlayed} />
        <StatBox label="مجموع الأهداف" value={stats.totalGoals} />
        <StatBox label="معدل الأهداف/مباراة" value={stats.avgGoalsPerMatch} />
        <StatBox label="أفضل هجوم" value={stats.bestAttack ? `${stats.bestAttack.name} (${stats.bestAttack.gf})` : "—"} />
      </div>

      <button onClick={exportCSV} className="text-xs px-3 py-1.5 rounded-lg font-bold" style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}>
        📥 تصدير الترتيب والنتائج (CSV)
      </button>

      {standingsByGroup.map((group) => (
        <div key={group.groupId ?? "none"} className="card overflow-x-auto">
          {!singleFlatTable && (
            <p className="text-sm font-bold px-3 pt-3" style={{ color: "var(--text-main)" }}>
              {group.groupId ? groupNameById.get(group.groupId) || "مجموعة" : "بدون مجموعة"}
            </p>
          )}
          <table className="w-full text-sm" style={{ minWidth: "480px" }}>
            <thead>
              <tr style={{ background: "var(--mint-100)" }}>
                {["#", "الفريق", "لعب", "فاز", "تعادل", "خسر", "له", "عليه", "الفرق", "نقاط"].map((h) => (
                  <th key={h} className="px-2 py-2 text-center font-bold" style={{ color: "var(--mint-700)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {group.standings.map((r, i) => (
                <tr key={r.teamId} style={{ borderTop: "1px solid var(--mint-100)" }}>
                  <td className="px-2 py-2 text-center">{i + 1}</td>
                  <td className="px-2 py-2 text-center font-bold" style={{ color: "var(--text-main)" }}>{r.name}</td>
                  <td className="px-2 py-2 text-center">{r.played}</td>
                  <td className="px-2 py-2 text-center">{r.won}</td>
                  <td className="px-2 py-2 text-center">{r.drawn}</td>
                  <td className="px-2 py-2 text-center">{r.lost}</td>
                  <td className="px-2 py-2 text-center">{r.gf}</td>
                  <td className="px-2 py-2 text-center">{r.ga}</td>
                  <td className="px-2 py-2 text-center">{r.gd}</td>
                  <td className="px-2 py-2 text-center font-black" style={{ color: "var(--mint-700)" }}>{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-lg font-black" style={{ color: "var(--mint-700)" }}>{value}</p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}

function ScorersTab({ topScorers }: { topScorers: TopScorerRow[] }) {
  if (topScorers.length === 0) {
    return <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>لا توجد أهداف مسجلة بعد</p>;
  }
  return (
    <div className="space-y-2">
      {topScorers.slice(0, 15).map((s, i) => (
        <div key={s.memberId} className="card p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
              style={{ background: i === 0 ? "#fde68a" : "var(--mint-100)", color: i === 0 ? "#92400e" : "var(--mint-700)" }}
            >
              {i + 1}
            </span>
            <div>
              <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>{s.fullName}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.teamName}</p>
            </div>
          </div>
          <span className="font-black" style={{ color: "var(--mint-700)" }}>⚽ {s.goals}</span>
        </div>
      ))}
    </div>
  );
}
