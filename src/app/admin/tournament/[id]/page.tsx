"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  groupStandings,
  computeTopScorers,
  computeStats,
  computeDisciplineStats,
  computeCleanSheets,
  computeMotmLeaders,
  computeTeamAdvancedStats,
  getHeadToHead,
  getMatchWinnerTeamId,
  formatMatchDateTime,
  matchDateToLocalInput,
  type StandingsRow,
  type TopScorerRow,
  type DisciplineRow,
  type CleanSheetRow,
  type MotmRow,
  type TeamAdvancedRow,
} from "@/lib/tournament";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import TeamLogo from "@/components/tournament/TeamLogo";
import BracketTree from "@/components/tournament/BracketTree";
import StatsToggle from "@/components/tournament/StatsToggle";
import PhotoUpload from "@/components/PhotoUpload";
import { loginPathWithNext } from "@/lib/utils";

interface RosterMember {
  id: string;
  fullName: string;
  phone: string;
  age: string;
  photo: string | null;
  team: { id: string; name: string } | null;
}

interface Group {
  id: string;
  name: string;
  capacity: number | null;
}

interface TeamMemberEntry {
  status: "PENDING" | "ACTIVE";
  member: { id: string; fullName: string; phone: string; age: string; photo: string | null };
}

interface Team {
  id: string;
  name: string;
  logo: string | null;
  groupId: string | null;
  group: Group | null;
  members: TeamMemberEntry[];
}

interface MatchGoal {
  id: string;
  count: number;
  minute: number | null;
  teamId: string;
  member: { id: string; fullName: string; photo: string | null };
}

interface MatchBooking {
  id: string;
  cardType: "YELLOW" | "RED";
  minute: number | null;
  teamId: string;
  member: { id: string; fullName: string; photo: string | null };
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
  homeTeam: { id: string; name: string; logo: string | null };
  awayTeam: { id: string; name: string; logo: string | null };
  matchDate: string | null;
  round: string | null;
  venue: string | null;
  order: number;
  isKnockout: boolean;
  bracketRound: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  manOfTheMatch: { id: string; fullName: string; photo: string | null } | null;
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
        router.push(loginPathWithNext("/admin/login"));
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
  const discipline = useMemo(() => computeDisciplineStats(teams, matches), [teams, matches]);
  const cleanSheets = useMemo(() => computeCleanSheets(teams, matches), [teams, matches]);
  const motmLeaders = useMemo(() => computeMotmLeaders(teams, matches), [teams, matches]);
  const teamAdvancedStats = useMemo(
    () => computeTeamAdvancedStats(teams, matches),
    [teams, matches],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-pulse" style={{ color: "var(--mint-500)" }}>
          ⏳
        </div>
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
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
              ⚽ إدارة البطولة
            </p>
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
          <div
            className="p-3 rounded-xl text-sm font-semibold mb-4"
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            ⚠️ {error}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 mb-5">
          {(
            [
              ["teams", "الفرق"],
              ["matches", "المباريات"],
              ["standings", "الترتيب"],
              ["scorers", "الإحصائيات"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
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
          <MatchesTab
            activityId={activityId}
            teams={teams}
            groups={groups}
            matches={matches}
            onChange={loadAll}
          />
        )}
        {tab === "standings" && (
          <StandingsTab
            title={title}
            standingsByGroup={standingsByGroup}
            groups={groups}
            stats={stats}
            matches={matches}
          />
        )}
        {tab === "scorers" && (
          <ScorersTab
            topScorers={topScorers}
            discipline={discipline}
            cleanSheets={cleanSheets}
            motmLeaders={motmLeaders}
            teamAdvancedStats={teamAdvancedStats}
          />
        )}
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
  const [newTeamLogo, setNewTeamLogo] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCapacity, setNewGroupCapacity] = useState("");
  const [editingCapacityId, setEditingCapacityId] = useState<string | null>(null);
  const [editCapacity, setEditCapacity] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Record<string, string>>({});
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState("");

  const unassigned = roster.filter((m) => !m.team);

  async function renameTeam(teamId: string) {
    if (!editTeamName.trim()) return;
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editTeamName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setEditingTeamId(null);
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoadingAction(false);
    }
  }

  async function renameMember(memberId: string) {
    if (!editMemberName.trim()) return;
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: editMemberName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setEditingMemberId(null);
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoadingAction(false);
    }
  }

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/activities/${activityId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName, capacity: newGroupCapacity || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setNewGroupName("");
      setNewGroupCapacity("");
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoadingAction(false);
    }
  }

  async function saveCapacity(group: Group) {
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: group.name, capacity: editCapacity || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setEditingCapacityId(null);
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
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

  async function setTeamLogo(teamId: string, logo: string) {
    const res = await fetch(`/api/admin/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logo: logo || null }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "فشلت العملية");
    onChange();
  }

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/activities/${activityId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTeamName,
          groupId: newTeamGroup || null,
          logo: newTeamLogo || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setNewTeamName("");
      setNewTeamGroup("");
      setNewTeamLogo("");
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
      const res = await fetch(`/api/admin/teams/${teamId}/members/${memberId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("فشلت العملية");
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoadingAction(false);
    }
  }

  async function approveMember(teamId: string, memberId: string) {
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/members/${memberId}`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
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
        <div
          className="p-3 rounded-xl text-sm font-semibold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          ⚠️ {error}
        </div>
      )}

      <div className="card p-4">
        <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
          🗂️ المجموعات (اختياري — للبطولات بنظام الدوري ثم خروج المغلوب)
        </p>
        {groups.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {groups.map((g) => {
              const count = teams.filter((t) => t.groupId === g.id).length;
              const full = g.capacity != null && count >= g.capacity;
              return (
                <span
                  key={g.id}
                  className={
                    full
                      ? "badge flex items-center gap-1.5"
                      : "badge badge-pending flex items-center gap-1.5"
                  }
                  style={full ? { background: "#d1fae5", color: "#065f46" } : undefined}
                >
                  {g.name}
                  {g.capacity != null && (
                    <span className="font-semibold">
                      ({count}/{g.capacity})
                    </span>
                  )}
                  {editingCapacityId === g.id ? (
                    <span className="flex items-center gap-1">
                      <input
                        type="number"
                        min={2}
                        max={64}
                        value={editCapacity}
                        onChange={(e) => setEditCapacity(e.target.value)}
                        className="input text-xs"
                        style={{ width: "56px", padding: "2px 4px" }}
                        autoFocus
                      />
                      <button onClick={() => saveCapacity(g)} className="font-bold">
                        ✓
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingCapacityId(g.id);
                        setEditCapacity(g.capacity != null ? String(g.capacity) : "");
                      }}
                      className="text-xs"
                      title="تحديد عدد الفرق المستهدف"
                    >
                      🎯
                    </button>
                  )}
                  <button
                    onClick={() => deleteGroup(g.id)}
                    className="font-bold"
                    style={{ color: "#991b1b" }}
                  >
                    ✕
                  </button>
                </span>
              );
            })}
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
          <input
            type="number"
            min={2}
            max={64}
            placeholder="عدد الفرق المستهدف"
            value={newGroupCapacity}
            onChange={(e) => setNewGroupCapacity(e.target.value)}
            className="input text-sm"
            style={{ width: "110px" }}
          />
          <button
            type="submit"
            disabled={!newGroupName.trim() || loadingAction}
            className="btn btn-primary text-xs px-3"
            style={{ width: "auto" }}
          >
            إضافة
          </button>
        </form>
      </div>

      {groups.length > 0 && teams.some((t) => !t.groupId) && (
        <div className="card p-4">
          <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
            🏳️ فرق بدون مجموعة ({teams.filter((t) => !t.groupId).length})
          </p>
          <div className="space-y-1.5">
            {teams
              .filter((t) => !t.groupId)
              .map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                    {t.name}
                  </span>
                  <select
                    value=""
                    onChange={(e) => setTeamGroup(t.id, e.target.value)}
                    className="input text-xs"
                    style={{ width: "auto" }}
                  >
                    <option value="">اختر مجموعة...</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
          </div>
        </div>
      )}

      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        عدد الفرق: {teams.length}
      </p>

      {teams.map((team) => (
        <div key={team.id} className="card p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            {editingTeamId === team.id ? (
              <div className="flex items-center gap-1.5 flex-1">
                <input
                  type="text"
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  maxLength={40}
                  className="input text-sm flex-1"
                  autoFocus
                />
                <button
                  onClick={() => renameTeam(team.id)}
                  disabled={loadingAction}
                  className="text-xs px-2 py-1 rounded-lg font-bold"
                  style={{ background: "var(--mint-600)", color: "white" }}
                >
                  حفظ
                </button>
                <button
                  onClick={() => setEditingTeamId(null)}
                  className="text-xs px-2 py-1 rounded-lg font-bold"
                  style={{
                    background: "white",
                    color: "var(--text-muted)",
                    border: "1px solid var(--mint-200)",
                  }}
                >
                  إلغاء
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditingTeamId(team.id);
                  setEditTeamName(team.name);
                }}
                className="font-bold flex items-center gap-1.5"
                style={{ color: "var(--text-main)" }}
              >
                <TeamLogo logo={team.logo} name={team.name} size={22} />
                {team.name} <span className="text-xs">✏️</span>
              </button>
            )}
            <button
              onClick={() => deleteTeam(team.id)}
              disabled={loadingAction}
              className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              🗑 حذف الفريق
            </button>
          </div>

          <PhotoUpload
            photo={team.logo}
            imageUrlPrefix="/api/files/team"
            variant="avatar"
            label="شعار الفريق"
            placeholderIcon="🛡️"
            onUpload={(filename) => setTeamLogo(team.id, filename)}
          />

          {groups.length > 0 && (
            <select
              value={team.groupId || ""}
              onChange={(e) => setTeamGroup(team.id, e.target.value)}
              className="input text-sm mb-2"
            >
              <option value="">بدون مجموعة</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}

          <div className="space-y-1.5 mb-2">
            {team.members.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                لا يوجد لاعبون بعد
              </p>
            ) : (
              team.members.map(({ member, status }) => (
                <div key={member.id} className="flex items-center justify-between text-sm gap-2">
                  {editingMemberId === member.id ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="text"
                        value={editMemberName}
                        onChange={(e) => setEditMemberName(e.target.value)}
                        maxLength={30}
                        className="input text-sm flex-1"
                        autoFocus
                      />
                      <button
                        onClick={() => renameMember(member.id)}
                        disabled={loadingAction}
                        className="text-xs px-2 py-1 rounded-lg font-bold"
                        style={{ background: "var(--mint-600)", color: "white" }}
                      >
                        حفظ
                      </button>
                      <button
                        onClick={() => setEditingMemberId(null)}
                        className="text-xs px-2 py-1 rounded-lg font-bold"
                        style={{
                          background: "white",
                          color: "var(--text-muted)",
                          border: "1px solid var(--mint-200)",
                        }}
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingMemberId(member.id);
                        setEditMemberName(member.fullName);
                      }}
                      className="flex-1 flex items-center gap-2 text-right"
                      style={{ color: "var(--text-main)" }}
                    >
                      <PlayerAvatar photo={member.photo} fullName={member.fullName} size={22} />
                      {member.fullName} <span className="text-xs">✏️</span>
                      {status === "PENDING" && (
                        <span className="badge badge-pending" style={{ fontSize: "10px" }}>
                          ⏳ بانتظار الموافقة
                        </span>
                      )}
                    </button>
                  )}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {status === "PENDING" && (
                      <button
                        onClick={() => approveMember(team.id, member.id)}
                        disabled={loadingAction}
                        className="text-xs px-2 py-1 rounded-lg font-bold"
                        style={{ background: "var(--mint-600)", color: "white" }}
                      >
                        ✓ قبول
                      </button>
                    )}
                    <button
                      onClick={() => removeMember(team.id, member.id)}
                      className="text-xs px-2 py-1 rounded-lg font-bold"
                      style={{
                        background: status === "PENDING" ? "#fee2e2" : "var(--mint-100)",
                        color: status === "PENDING" ? "#991b1b" : "var(--mint-700)",
                      }}
                    >
                      {status === "PENDING" ? "✕ رفض" : "إزالة"}
                    </button>
                  </div>
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
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
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
        <PhotoUpload
          photo={newTeamLogo || null}
          imageUrlPrefix="/api/files/team"
          variant="avatar"
          label="شعار الفريق"
          placeholderIcon="🛡️"
          onUpload={(filename) => setNewTeamLogo(filename)}
        />
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
          <select
            value={newTeamGroup}
            onChange={(e) => setNewTeamGroup(e.target.value)}
            className="input"
          >
            <option value="">بدون مجموعة</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
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
            {unassigned.map((m) =>
              editingMemberId === m.id ? (
                <div key={m.id} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editMemberName}
                    onChange={(e) => setEditMemberName(e.target.value)}
                    maxLength={30}
                    className="input text-xs"
                    style={{ width: "120px" }}
                    autoFocus
                  />
                  <button
                    onClick={() => renameMember(m.id)}
                    disabled={loadingAction}
                    className="text-xs px-2 py-1 rounded-lg font-bold"
                    style={{ background: "var(--mint-600)", color: "white" }}
                  >
                    حفظ
                  </button>
                  <button
                    onClick={() => setEditingMemberId(null)}
                    className="text-xs px-2 py-1 rounded-lg font-bold"
                    style={{
                      background: "white",
                      color: "var(--text-muted)",
                      border: "1px solid var(--mint-200)",
                    }}
                  >
                    إلغاء
                  </button>
                </div>
              ) : (
                <button
                  key={m.id}
                  onClick={() => {
                    setEditingMemberId(m.id);
                    setEditMemberName(m.fullName);
                  }}
                  className="badge badge-pending flex items-center gap-1.5"
                >
                  <PlayerAvatar photo={m.photo} fullName={m.fullName} size={16} />
                  {m.fullName} ✏️
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchesTab({
  activityId,
  teams,
  groups,
  matches,
  onChange,
}: {
  activityId: string;
  teams: Team[];
  groups: Group[];
  matches: Match[];
  onChange: () => void;
}) {
  const [form, setForm] = useState({
    homeTeamId: "",
    awayTeamId: "",
    matchDate: "",
    round: "",
    venue: "",
    isKnockout: false,
  });
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState("");
  const [resultFormFor, setResultFormFor] = useState<string | null>(null);
  const [cardsFor, setCardsFor] = useState<string | null>(null);
  const [mvpFor, setMvpFor] = useState<string | null>(null);
  const [detailsFor, setDetailsFor] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function generateSchedule() {
    if (
      !confirm(
        "سيتم اقتراح مباريات إضافية تلقائياً بحيث يلعب كل فريق 3 مباريات إجمالاً. يمكنك حذف أو تعديل أي مباراة بعد ذلك. متابعة؟",
      )
    )
      return;
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/activities/${activityId}/matches/generate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setGenerating(false);
    }
  }

  async function runBracketAction(endpoint: string, confirmMsg: string) {
    if (!confirm(confirmMsg)) return;
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/activities/${activityId}/bracket/${endpoint}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setGenerating(false);
    }
  }

  const bracketMatches = matches.filter((m) => m.bracketRound !== null) as (Match & {
    bracketRound: number;
  })[];
  const maxBracketRound =
    bracketMatches.length > 0 ? Math.max(...bracketMatches.map((m) => m.bracketRound)) : 0;
  const currentBracketRoundMatches = bracketMatches.filter(
    (m) => m.bracketRound === maxBracketRound,
  );
  const bracketIsFinalDone =
    currentBracketRoundMatches.length === 1 && currentBracketRoundMatches[0].status === "PLAYED";
  const canAdvanceBracket = bracketMatches.length > 0 && !bracketIsFinalDone;

  // Poules "remplies" : chaque groupe a atteint sa taille cible et aucun calendrier n'a encore été généré.
  const poolsReady =
    groups.length > 0 &&
    groups.every(
      (g) => g.capacity != null && teams.filter((t) => t.groupId === g.id).length >= g.capacity,
    ) &&
    matches.length === 0;

  // Phase de poules terminée : tous les matchs de poule joués (s'il y a des groupes).
  const leagueMatches = matches.filter((m) => !m.isKnockout);
  const groupStageDone =
    leagueMatches.length > 0 && leagueMatches.every((m) => m.status === "PLAYED");
  const groupStageComplete = groups.length === 2 && groupStageDone && bracketMatches.length === 0;
  // Tant qu'il y a des groupes, le tirage/bracket ne doit pas apparaître avant la fin du tour des poules.
  const knockoutLocked = groups.length > 0 && !groupStageDone;
  // Format foot standard du club : toujours 2 poules de 4 → demi-finale puis finale,
  // donc pas de tirage aléatoire générique (réservé aux tournois sans poules, ex. échecs/PlayStation).
  const isTwoGroupFormat = groups.length === 2;

  async function moveMatch(list: Match[], index: number, direction: "up" | "down") {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= list.length) return;
    const a = list[index];
    const b = list[swapIndex];
    setLoadingAction(true);
    try {
      await Promise.all([
        fetch(`/api/admin/matches/${a.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: b.order }),
        }),
        fetch(`/api/admin/matches/${b.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: a.order }),
        }),
      ]);
      onChange();
    } catch {
      alert("خطأ في إعادة الترتيب");
    } finally {
      setLoadingAction(false);
    }
  }

  async function createMatch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.homeTeamId || !form.awayTeamId) {
      setError("يجب اختيار الفريقين");
      return;
    }
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/activities/${activityId}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setForm({
        homeTeamId: "",
        awayTeamId: "",
        matchDate: "",
        round: "",
        venue: "",
        isKnockout: false,
      });
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

  // Same-group teams only for a league match — cross-group pairings are only
  // valid once "مباراة خروج المغلوب" (knockout) is checked.
  const homeTeamForForm = teams.find((t) => t.id === form.homeTeamId);
  const awayTeamOptions = teams.filter((t) => {
    if (t.id === form.homeTeamId) return false;
    if (form.isKnockout) return true;
    if (!homeTeamForForm || homeTeamForForm.groupId === null || t.groupId === null) return true;
    return t.groupId === homeTeamForForm.groupId;
  });

  const scheduled = matches.filter((m) => m.status === "SCHEDULED");
  const played = matches.filter((m) => m.status === "PLAYED");

  return (
    <div className="space-y-4">
      {error && (
        <div
          className="p-3 rounded-xl text-sm font-semibold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          ⚠️ {error}
        </div>
      )}

      {poolsReady && (
        <div
          className="card p-4 space-y-2"
          style={{ background: "#d1fae5", border: "1px solid #6ee7b7" }}
        >
          <p className="text-sm font-black" style={{ color: "#065f46" }}>
            ✅ كل المجموعات مكتملة!
          </p>
          <p className="text-xs" style={{ color: "#065f46" }}>
            يمكنك الآن توليد جدول مباريات دور المجموعات (3 مباريات لكل فريق).
          </p>
          <button
            onClick={generateSchedule}
            disabled={generating}
            className="btn btn-primary text-sm"
            style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
          >
            {generating ? "..." : "🎲 توليد جدول مباريات دور المجموعات"}
          </button>
        </div>
      )}

      {groupStageComplete && (
        <div
          className="card p-4 space-y-2"
          style={{ background: "#d1fae5", border: "1px solid #6ee7b7" }}
        >
          <p className="text-sm font-black" style={{ color: "#065f46" }}>
            ✅ انتهى دور المجموعات!
          </p>
          <p className="text-xs" style={{ color: "#065f46" }}>
            كل الفرق لعبت مبارياتها — يمكنك الآن توليد نصف النهائي من ترتيب المجموعتين.
          </p>
          <button
            onClick={() =>
              runBracketAction("semis-from-groups", "توليد نصف النهائي من ترتيب المجموعتين؟")
            }
            disabled={generating}
            className="btn btn-primary text-sm"
            style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
          >
            {generating ? "..." : "⚔️ توليد نصف النهائي"}
          </button>
        </div>
      )}

      {teams.length >= 2 && (
        <div className="card p-4 space-y-3">
          <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
            {isTwoGroupFormat
              ? "🏆 نصف النهائي والنهائي"
              : "🏆 القرعة الإقصائية (شطرنج، بلايستيشن، أو أي نظام إقصاء مباشر)"}
          </p>
          {bracketMatches.length === 0 ? (
            knockoutLocked ? (
              <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                🔒 أكمل جميع نتائج دور المجموعات أولاً — ستظهر خيارات الدور الإقصائي هنا بعد انتهاء
                دور المجموعات.
              </p>
            ) : isTwoGroupFormat ? (
              <>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  نصف نهائي متقاطع من ترتيب المجموعتين (الأول من كل مجموعة أمام الثاني من الأخرى)،
                  ثم النهائي.
                </p>
                <button
                  onClick={() =>
                    runBracketAction("semis-from-groups", "توليد نصف النهائي من ترتيب المجموعتين؟")
                  }
                  disabled={generating}
                  className="btn btn-primary text-sm"
                  style={{ width: "auto" }}
                >
                  ⚔️ توليد نصف النهائي
                </button>
              </>
            ) : (
              <>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  قرعة عشوائية بين كل الفرق/اللاعبين المسجَّلين — يجب أن يكون العدد 4 أو 8 أو 16 أو
                  32...
                </p>
                <button
                  onClick={() =>
                    runBracketAction("draw", "إجراء قرعة عشوائية بين جميع الفرق الحالية؟")
                  }
                  disabled={generating}
                  className="btn btn-primary text-sm"
                  style={{ width: "auto" }}
                >
                  🎲 قرعة عشوائية
                </button>
              </>
            )
          ) : (
            <>
              <BracketTree matches={bracketMatches} />
              {canAdvanceBracket && (
                <button
                  onClick={() =>
                    runBracketAction("next-round", "توليد الدور التالي من نتائج الدور الحالي؟")
                  }
                  disabled={generating}
                  className="btn btn-primary text-sm"
                >
                  ➡️ توليد الدور التالي
                </button>
              )}
              {bracketIsFinalDone &&
                (() => {
                  const finalMatch = currentBracketRoundMatches[0];
                  const winnerId = getMatchWinnerTeamId({
                    ...finalMatch,
                    homeTeamId: finalMatch.homeTeam.id,
                    awayTeamId: finalMatch.awayTeam.id,
                  });
                  const winnerName =
                    winnerId === finalMatch.homeTeam.id
                      ? finalMatch.homeTeam.name
                      : finalMatch.awayTeam.name;
                  return (
                    <p
                      className="text-sm font-black text-center"
                      style={{ color: "var(--mint-700)" }}
                    >
                      🏆 البطل: {winnerName}
                    </p>
                  );
                })()}
            </>
          )}
        </div>
      )}

      {teams.length >= 2 && (
        <button
          onClick={generateSchedule}
          disabled={generating}
          className="btn btn-primary text-sm"
          style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
        >
          {generating ? "..." : "🎲 اقترح جدول المباريات (3 مباريات لكل فريق)"}
        </button>
      )}

      <form onSubmit={createMatch} className="card p-4 space-y-3">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          ➕ مباراة جديدة
        </p>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.homeTeamId}
            onChange={(e) => setForm((p) => ({ ...p, homeTeamId: e.target.value, awayTeamId: "" }))}
            className="input"
          >
            <option value="">الفريق المضيف...</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            value={form.awayTeamId}
            onChange={(e) => setForm((p) => ({ ...p, awayTeamId: e.target.value }))}
            className="input"
          >
            <option value="">الفريق الضيف...</option>
            {awayTeamOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="datetime-local"
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
        <label
          className="flex items-center gap-2 text-sm font-semibold"
          style={{ color: "var(--text-main)" }}
        >
          <input
            type="checkbox"
            checked={form.isKnockout}
            onChange={(e) =>
              setForm((p) => ({ ...p, isKnockout: e.target.checked, awayTeamId: "" }))
            }
          />
          🏆 مباراة خروج المغلوب (لا تُحتسب في ترتيب المجموعات)
        </label>
        <button type="submit" disabled={loadingAction} className="btn btn-primary text-sm">
          {loadingAction ? "..." : "إضافة المباراة"}
        </button>
      </form>

      {scheduled.length > 0 && (
        <div>
          <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
            📅 مباريات قادمة
          </p>
          <div className="space-y-3">
            {scheduled.map((m, i) => (
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
                showDetails={detailsFor === m.id}
                onToggleDetails={() => setDetailsFor((v) => (v === m.id ? null : m.id))}
                onMoveUp={i > 0 ? () => moveMatch(scheduled, i, "up") : undefined}
                onMoveDown={
                  i < scheduled.length - 1 ? () => moveMatch(scheduled, i, "down") : undefined
                }
                onSaved={() => {
                  setResultFormFor(null);
                  onChange();
                }}
                onChange={onChange}
              />
            ))}
          </div>
        </div>
      )}

      {played.length > 0 && (
        <div>
          <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
            ✅ نتائج
          </p>
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
                showDetails={detailsFor === m.id}
                onToggleDetails={() => setDetailsFor((v) => (v === m.id ? null : m.id))}
                onSaved={() => {
                  setResultFormFor(null);
                  onChange();
                }}
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
  showDetails,
  onToggleDetails,
  onMoveUp,
  onMoveDown,
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
  showDetails: boolean;
  onToggleDetails: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onSaved: () => void;
  onChange: () => void;
}) {
  const priorMeetings = getHeadToHead(allMatches, match.homeTeam.id, match.awayTeam.id, match.id);
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p
            className="font-bold text-sm flex items-center gap-1.5 flex-wrap"
            style={{ color: "var(--text-main)" }}
          >
            <TeamLogo logo={match.homeTeam.logo} name={match.homeTeam.name} size={20} />
            {match.homeTeam.name}
            {match.status === "PLAYED" ? ` ${match.homeScore} - ${match.awayScore} ` : " × "}
            {match.awayTeam.name}
            <TeamLogo logo={match.awayTeam.logo} name={match.awayTeam.name} size={20} />
            {match.homePenalties !== null && match.awayPenalties !== null && (
              <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                {" "}
                (ركلات ترجيح {match.homePenalties}-{match.awayPenalties})
              </span>
            )}
          </p>
          <div
            className="flex items-center gap-2 text-xs mt-1 flex-wrap"
            style={{ color: "var(--text-muted)" }}
          >
            {match.round && <span>{match.round}</span>}
            {match.venue && <span>📍 {match.venue}</span>}
            {match.matchDate && <span dir="ltr">{formatMatchDateTime(match.matchDate)}</span>}
            {match.isKnockout && <span className="badge badge-pending">إقصائية</span>}
          </div>
          {priorMeetings.length > 0 && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              🔁 مواجهات سابقة:{" "}
              {priorMeetings
                .map((pm) => (pm.status === "PLAYED" ? `${pm.homeScore}-${pm.awayScore}` : "قادمة"))
                .join("، ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(onMoveUp || onMoveDown) && (
            <div className="flex flex-col gap-0.5">
              <button
                onClick={onMoveUp}
                disabled={!onMoveUp}
                className="w-6 h-5 rounded flex items-center justify-center text-xs font-bold disabled:opacity-30"
                style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                title="تقديم"
              >
                ▲
              </button>
              <button
                onClick={onMoveDown}
                disabled={!onMoveDown}
                className="w-6 h-5 rounded flex items-center justify-center text-xs font-bold disabled:opacity-30"
                style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                title="تأخير"
              >
                ▼
              </button>
            </div>
          )}
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
        <div
          className="mt-2 pt-2 flex flex-wrap gap-1.5"
          style={{ borderTop: "1px solid var(--mint-100)" }}
        >
          {match.goals.map((g) => (
            <span key={g.id} className="badge badge-active flex items-center gap-1.5">
              <PlayerAvatar photo={g.member.photo} fullName={g.member.fullName} size={18} />⚽{" "}
              {g.member.fullName}
              {g.minute ? ` ${g.minute}'` : ""}
              {g.count > 1 ? ` (${g.count})` : ""}
            </span>
          ))}
        </div>
      )}

      {match.manOfTheMatch && (
        <p
          className="text-xs mt-2 font-semibold flex items-center gap-1.5"
          style={{ color: "var(--mint-700)" }}
        >
          <PlayerAvatar
            photo={match.manOfTheMatch.photo}
            fullName={match.manOfTheMatch.fullName}
            size={20}
          />
          🌟 رجل المباراة: {match.manOfTheMatch.fullName}
        </p>
      )}

      {match.bookings.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {match.bookings.map((b) => (
            <span key={b.id} className="badge badge-rejected flex items-center gap-1.5">
              <PlayerAvatar photo={b.member.photo} fullName={b.member.fullName} size={18} />
              {CARD_LABEL[b.cardType]} {b.member.fullName}
              {b.minute ? ` (${b.minute}')` : ""}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <button
          onClick={onToggleCards}
          className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
          style={{
            background: "white",
            color: "var(--mint-700)",
            border: "1px solid var(--mint-200)",
          }}
        >
          {showCards ? "إخفاء البطاقات" : "🟨🟥 إدارة البطاقات"}
        </button>
        <button
          onClick={onToggleMvp}
          className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
          style={{
            background: "white",
            color: "var(--mint-700)",
            border: "1px solid var(--mint-200)",
          }}
        >
          {showMvp ? "إخفاء التصويت" : "🌟 أفضل لاعب"}
        </button>
        <button
          onClick={onToggleDetails}
          className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
          style={{
            background: "white",
            color: "var(--mint-700)",
            border: "1px solid var(--mint-200)",
          }}
        >
          {showDetails ? "إخفاء التفاصيل" : "✏️ تعديل التفاصيل"}
        </button>
      </div>

      {showCards && <BookingsForm match={match} teams={teams} onChange={onChange} />}
      {showResultForm && <ResultForm match={match} teams={teams} onSaved={onSaved} />}
      {showMvp && <MvpVoteAdmin match={match} teams={teams} onChange={onChange} />}
      {showDetails && <MatchDetailsForm match={match} teams={teams} onChange={onChange} />}
    </div>
  );
}

function MatchDetailsForm({
  match,
  teams,
  onChange,
}: {
  match: Match;
  teams: Team[];
  onChange: () => void;
}) {
  const [matchDate, setMatchDate] = useState(
    match.matchDate ? matchDateToLocalInput(match.matchDate) : "",
  );
  const [round, setRound] = useState(match.round || "");
  const [venue, setVenue] = useState(match.venue || "");
  const [isKnockout, setIsKnockout] = useState(match.isKnockout);
  const [homeTeamId, setHomeTeamId] = useState(match.homeTeam.id);
  const [awayTeamId, setAwayTeamId] = useState(match.awayTeam.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!awayTeamId) {
      setError("يجب اختيار الفريق الضيف");
      return;
    }
    if (homeTeamId === awayTeamId) {
      setError("لا يمكن أن يلعب الفريق ضد نفسه");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/matches/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchDate: matchDate || null,
          round: round || null,
          venue: venue || null,
          isKnockout,
          homeTeamId,
          awayTeamId,
        }),
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

  const homeTeamForEdit = teams.find((t) => t.id === homeTeamId);
  const awayTeamOptionsForEdit = teams.filter((t) => {
    if (t.id === homeTeamId) return false;
    if (isKnockout) return true;
    if (!homeTeamForEdit || homeTeamForEdit.groupId === null || t.groupId === null) return true;
    return t.groupId === homeTeamForEdit.groupId;
  });

  return (
    <form
      onSubmit={save}
      className="mt-3 pt-3 space-y-2"
      style={{ borderTop: "1px solid var(--mint-100)" }}
    >
      <div className="grid grid-cols-2 gap-2">
        <select
          value={homeTeamId}
          onChange={(e) => {
            setHomeTeamId(e.target.value);
            setAwayTeamId("");
          }}
          className="input text-sm"
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={awayTeamId}
          onChange={(e) => setAwayTeamId(e.target.value)}
          className="input text-sm"
        >
          <option value="">اختر الفريق الضيف...</option>
          {awayTeamOptionsForEdit.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="datetime-local"
          value={matchDate}
          onChange={(e) => setMatchDate(e.target.value)}
          className="input text-sm"
        />
        <input
          type="text"
          placeholder="الجولة"
          value={round}
          onChange={(e) => setRound(e.target.value)}
          maxLength={40}
          className="input text-sm"
        />
      </div>
      <input
        type="text"
        placeholder="الملعب"
        value={venue}
        onChange={(e) => setVenue(e.target.value)}
        maxLength={60}
        className="input text-sm"
      />
      <label
        className="flex items-center gap-2 text-xs font-semibold"
        style={{ color: "var(--text-main)" }}
      >
        <input
          type="checkbox"
          checked={isKnockout}
          onChange={(e) => {
            setIsKnockout(e.target.checked);
            setAwayTeamId("");
          }}
        />
        🏆 مباراة خروج المغلوب
      </label>
      {error && (
        <p className="text-xs" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary text-xs px-3"
        style={{ width: "auto" }}
      >
        {loading ? "..." : "حفظ التفاصيل"}
      </button>
    </form>
  );
}

function BookingsForm({
  match,
  teams,
  onChange,
}: {
  match: Match;
  teams: Team[];
  onChange: () => void;
}) {
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
              <span>
                {CARD_LABEL[b.cardType]} {b.member.fullName}
                {b.minute ? ` — الدقيقة ${b.minute}` : ""}
              </span>
              <button
                onClick={() => removeBooking(b.id)}
                className="font-bold"
                style={{ color: "#991b1b" }}
              >
                حذف
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addBooking} className="flex flex-wrap gap-2 items-center">
        <select
          value={teamId}
          onChange={(e) => {
            setTeamId(e.target.value);
            setMemberId("");
          }}
          className="input text-sm"
          style={{ width: "auto" }}
        >
          <option value={match.homeTeam.id}>{match.homeTeam.name}</option>
          <option value={match.awayTeam.id}>{match.awayTeam.name}</option>
        </select>
        <select
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className="input text-sm flex-1"
        >
          <option value="">اختر لاعباً...</option>
          {roster.map((m) => (
            <option key={m.id} value={m.id}>
              {m.fullName}
            </option>
          ))}
        </select>
        <select
          value={cardType}
          onChange={(e) => setCardType(e.target.value as "YELLOW" | "RED")}
          className="input text-sm"
          style={{ width: "auto" }}
        >
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
        <button
          type="submit"
          disabled={!memberId || loading}
          className="btn btn-primary text-xs px-3"
          style={{ width: "auto" }}
        >
          إضافة
        </button>
      </form>
      {error && (
        <p className="text-xs" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function MvpVoteAdmin({
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

function ResultForm({
  match,
  teams,
  onSaved,
}: {
  match: Match;
  teams: Team[];
  onSaved: () => void;
}) {
  const homeRoster =
    teams.find((t) => t.id === match.homeTeam.id)?.members.map((m) => m.member) || [];
  const awayRoster =
    teams.find((t) => t.id === match.awayTeam.id)?.members.map((m) => m.member) || [];
  const combinedRoster = [...homeRoster, ...awayRoster];
  const [homeScore, setHomeScore] = useState(match.homeScore?.toString() ?? "");
  const [awayScore, setAwayScore] = useState(match.awayScore?.toString() ?? "");
  const [homeGoals, setHomeGoals] = useState<{ memberId: string; count: string; minute: string }[]>(
    match.goals
      .filter((g) => g.teamId === match.homeTeam.id)
      .map((g) => ({
        memberId: g.member.id,
        count: String(g.count),
        minute: g.minute != null ? String(g.minute) : "",
      })),
  );
  const [awayGoals, setAwayGoals] = useState<{ memberId: string; count: string; minute: string }[]>(
    match.goals
      .filter((g) => g.teamId === match.awayTeam.id)
      .map((g) => ({
        memberId: g.member.id,
        count: String(g.count),
        minute: g.minute != null ? String(g.minute) : "",
      })),
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
        homeGoals: homeGoals
          .filter((g) => g.memberId)
          .map((g) => ({
            memberId: g.memberId,
            count: Number(g.count) || 1,
            minute: g.minute || null,
          })),
        awayGoals: awayGoals
          .filter((g) => g.memberId)
          .map((g) => ({
            memberId: g.memberId,
            count: Number(g.count) || 1,
            minute: g.minute || null,
          })),
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
    <form
      onSubmit={save}
      className="mt-3 pt-3 space-y-3"
      style={{ borderTop: "1px solid var(--mint-100)" }}
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            {match.homeTeam.name}
          </label>
          <input
            type="number"
            min={0}
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            required
            className="input"
          />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            {match.awayTeam.name}
          </label>
          <input
            type="number"
            min={0}
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            required
            className="input"
          />
        </div>
      </div>

      {showPenalties && (
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
            ركلات الترجيح (النتيجة متعادلة — مباراة إقصائية)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              placeholder="ركلات المضيف"
              value={homePenalties}
              onChange={(e) => setHomePenalties(e.target.value)}
              className="input"
            />
            <input
              type="number"
              min={0}
              placeholder="ركلات الضيف"
              value={awayPenalties}
              onChange={(e) => setAwayPenalties(e.target.value)}
              className="input"
            />
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
        <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
          🌟 رجل المباراة (اختياري)
        </label>
        <select
          value={manOfTheMatchId}
          onChange={(e) => setManOfTheMatchId(e.target.value)}
          className="input"
        >
          <option value="">بدون</option>
          {combinedRoster.map((m) => (
            <option key={m.id} value={m.id}>
              {m.fullName}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div
          className="p-2.5 rounded-xl text-xs font-semibold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
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
  rows: { memberId: string; count: string; minute: string }[];
  setRows: (
    fn: (
      prev: { memberId: string; count: string; minute: string }[],
    ) => { memberId: string; count: string; minute: string }[],
  ) => void;
  teamMembers: { id: string; fullName: string }[];
}) {
  return (
    <div>
      <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      {teamMembers.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          لا يوجد لاعبون في هذا الفريق بعد
        </p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2">
              <select
                value={row.memberId}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r, idx) => (idx === i ? { ...r, memberId: e.target.value } : r)),
                  )
                }
                className="input flex-1 text-sm"
              >
                <option value="">اختر لاعباً...</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={row.count}
                title="عدد الأهداف"
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r, idx) => (idx === i ? { ...r, count: e.target.value } : r)),
                  )
                }
                className="input text-sm"
                style={{ width: "55px" }}
              />
              <input
                type="number"
                min={1}
                max={130}
                placeholder="الدقيقة"
                value={row.minute}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r, idx) => (idx === i ? { ...r, minute: e.target.value } : r)),
                  )
                }
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
            onClick={() => setRows((prev) => [...prev, { memberId: "", count: "1", minute: "" }])}
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
      if (!singleFlatTable)
        rows.push([group.groupId ? groupNameById.get(group.groupId) || "" : "بدون مجموعة"]);
      rows.push(["#", "الفريق", "لعب", "فاز", "تعادل", "خسر", "له", "عليه", "الفرق", "نقاط"]);
      group.standings.forEach((r, i) => {
        rows.push([
          String(i + 1),
          r.name,
          String(r.played),
          String(r.won),
          String(r.drawn),
          String(r.lost),
          String(r.gf),
          String(r.ga),
          String(r.gd),
          String(r.points),
        ]);
      });
      rows.push([]);
    }
    rows.push(["النتائج"]);
    rows.push(["الجولة", "المضيف", "النتيجة", "الضيف", "الملعب", "التاريخ"]);
    matches
      .filter((m) => m.status === "PLAYED")
      .forEach((m) => {
        rows.push([
          m.round || "",
          m.homeTeam.name,
          `${m.homeScore} - ${m.awayScore}`,
          m.awayTeam.name,
          m.venue || "",
          m.matchDate ? formatMatchDateTime(m.matchDate) : "",
        ]);
      });

    const csv =
      "﻿" +
      rows
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}-الترتيب-والنتائج.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!hasAnyTeams) {
    return (
      <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
        لا توجد فرق بعد
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <StatsToggle
        matchesPlayed={stats.matchesPlayed}
        totalGoals={stats.totalGoals}
        avgGoalsPerMatch={stats.avgGoalsPerMatch}
        bestAttack={stats.bestAttack ? `${stats.bestAttack.name} (${stats.bestAttack.gf})` : "—"}
      />

      <button
        onClick={exportCSV}
        className="text-xs px-3 py-1.5 rounded-lg font-bold"
        style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
      >
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
                {["#", "الفريق", "نقاط", "لعب", "فاز", "تعادل", "خسر", "له", "عليه", "الفرق"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-2 py-2 text-center font-bold"
                      style={{ color: "var(--mint-700)" }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {group.standings.map((r, i) => (
                <tr key={r.teamId} style={{ borderTop: "1px solid var(--mint-100)" }}>
                  <td className="px-2 py-2 text-center">{i + 1}</td>
                  <td className="px-2 py-2 font-bold" style={{ color: "var(--text-main)" }}>
                    <span className="flex items-center gap-1.5 justify-center">
                      <TeamLogo logo={r.logo} name={r.name} size={18} />
                      {r.name}
                    </span>
                  </td>
                  <td
                    className="px-2 py-2 text-center font-black"
                    style={{ color: "var(--mint-700)" }}
                  >
                    {r.points}
                  </td>
                  <td className="px-2 py-2 text-center">{r.played}</td>
                  <td className="px-2 py-2 text-center">{r.won}</td>
                  <td className="px-2 py-2 text-center">{r.drawn}</td>
                  <td className="px-2 py-2 text-center">{r.lost}</td>
                  <td className="px-2 py-2 text-center">{r.gf}</td>
                  <td className="px-2 py-2 text-center">{r.ga}</td>
                  <td className="px-2 py-2 text-center">{r.gd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function RankBadge({ i }: { i: number }) {
  return (
    <span
      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
      style={{
        background: i === 0 ? "#fde68a" : "var(--mint-100)",
        color: i === 0 ? "#92400e" : "var(--mint-700)",
      }}
    >
      {i + 1}
    </span>
  );
}

const FORM_STYLE: Record<"W" | "D" | "L", { bg: string; color: string }> = {
  W: { bg: "#d1fae5", color: "#065f46" },
  D: { bg: "var(--mint-100)", color: "var(--text-muted)" },
  L: { bg: "#fee2e2", color: "#991b1b" },
};

function ScorersTab({
  topScorers,
  discipline,
  cleanSheets,
  motmLeaders,
  teamAdvancedStats,
}: {
  topScorers: TopScorerRow[];
  discipline: DisciplineRow[];
  cleanSheets: CleanSheetRow[];
  motmLeaders: MotmRow[];
  teamAdvancedStats: TeamAdvancedRow[];
}) {
  const teamsWithStats = teamAdvancedStats.filter((t) => t.biggestWin || t.form.length > 0);
  const noData =
    topScorers.length === 0 &&
    discipline.length === 0 &&
    cleanSheets.length === 0 &&
    motmLeaders.length === 0 &&
    teamsWithStats.length === 0;

  if (noData) {
    return (
      <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
        لا توجد إحصائيات مسجلة بعد
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h3 className="text-sm font-black" style={{ color: "var(--text-main)" }}>
          ⚽ الهدافون
        </h3>
        {topScorers.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            لا توجد أهداف مسجلة بعد
          </p>
        ) : (
          topScorers.slice(0, 15).map((s, i) => (
            <div key={s.memberId} className="card p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <RankBadge i={i} />
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                    {s.fullName}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {s.teamName}
                  </p>
                </div>
              </div>
              <span className="font-black" style={{ color: "var(--mint-700)" }}>
                ⚽ {s.goals}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-black" style={{ color: "var(--text-main)" }}>
          🟨🟥 الانضباط
        </h3>
        {discipline.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            لا توجد بطاقات مسجلة بعد
          </p>
        ) : (
          discipline.slice(0, 15).map((d, i) => (
            <div key={d.memberId} className="card p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <RankBadge i={i} />
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                    {d.fullName}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {d.teamName}
                  </p>
                </div>
              </div>
              <span className="font-black text-sm" style={{ color: "var(--text-main)" }}>
                {d.yellow > 0 && `🟨${d.yellow}`} {d.red > 0 && `🟥${d.red}`}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-black" style={{ color: "var(--text-main)" }}>
          🧤 أفضل دفاع (مباريات بدون استقبال أهداف)
        </h3>
        {cleanSheets.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            لا توجد بيانات كافية بعد
          </p>
        ) : (
          cleanSheets.slice(0, 10).map((c, i) => (
            <div key={c.teamId} className="card p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <RankBadge i={i} />
                <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                  {c.name}
                </p>
              </div>
              <span className="font-black" style={{ color: "var(--mint-700)" }}>
                🧤 {c.cleanSheets}/{c.played}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-black" style={{ color: "var(--text-main)" }}>
          🌟 رجل المباراة
        </h3>
        {motmLeaders.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            لم يتم تحديد رجل مباراة بعد
          </p>
        ) : (
          motmLeaders.slice(0, 10).map((m, i) => (
            <div key={m.memberId} className="card p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <RankBadge i={i} />
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                    {m.fullName}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {m.teamName}
                  </p>
                </div>
              </div>
              <span className="font-black" style={{ color: "var(--mint-700)" }}>
                🌟 {m.count}
              </span>
            </div>
          ))
        )}
      </div>

      {teamsWithStats.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-black" style={{ color: "var(--text-main)" }}>
            📊 إحصائيات الفرق
          </h3>
          {teamsWithStats.map((t) => (
            <div key={t.teamId} className="card p-3 space-y-1">
              <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                {t.name}
              </p>
              {t.biggestWin && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  🔥 أكبر فوز: {t.biggestWin.score} أمام {t.biggestWin.opponent}
                </p>
              )}
              {t.unbeatenStreak > 0 && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  🛡️ سلسلة بدون هزيمة: {t.unbeatenStreak}
                </p>
              )}
              {t.form.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    آخر {t.form.length} مباريات:
                  </span>
                  {t.form.map((f, i) => (
                    <span
                      key={i}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                      style={{ background: FORM_STYLE[f].bg, color: FORM_STYLE[f].color }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
