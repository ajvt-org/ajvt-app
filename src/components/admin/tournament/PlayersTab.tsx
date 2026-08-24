"use client";

// The teams tab for a singles tournament: every entrant is a one-member team
// under the hood, but the admin only ever sees players. Adding one creates
// the auto-named team and seats the player in a single action.

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import GroupsPanel from "./GroupsPanel";
import type { Group, RosterMember, Team, TournamentFormat } from "./types";

export default function PlayersTab({
  activityId,
  teams,
  groups,
  format,
  roster,
  onChange,
}: {
  activityId: string;
  teams: Team[];
  groups: Group[];
  format: TournamentFormat;
  roster: RosterMember[];
  onChange: () => void;
}) {
  const showToast = useToast();
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");

  const candidates = roster.filter((m) => !m.team);
  const filtered = candidates.filter((m) => {
    const q = search.trim();
    return !q || m.fullName.includes(q) || (m.phone || "").includes(q);
  });
  const hasGroups = format !== "KNOCKOUT";

  async function run(action: () => Promise<unknown>, done?: string) {
    setBusy(true);
    try {
      await action();
      onChange();
      if (done) showToast(done);
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function addPlayer() {
    if (!selected) return;
    await run(async () => {
      const { team } = await api.post<{ team: { id: string } }>(
        `/api/admin/activities/${activityId}/teams`,
        { name: "", groupId: null, logo: null },
      );
      await api.post(`/api/admin/teams/${team.id}/members`, { memberId: selected });
      setSelected("");
    }, "أُضيف اللاعب");
  }

  function removePlayer(team: Team) {
    const name = team.members[0]?.member.fullName ?? team.name;
    if (!confirm(`إزالة ${name} من البطولة؟`)) return;
    run(() => api.del(`/api/admin/teams/${team.id}`), "أُزيل اللاعب");
  }

  return (
    <div className="space-y-4">
      {hasGroups && (
        <GroupsPanel
          activityId={activityId}
          groups={groups}
          teams={teams}
          onChange={onChange}
          onError={(message) => showToast(message, "error")}
        />
      )}

      <div className="card p-4 space-y-2">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="user">اللاعبون ({teams.length})</IconLabel>
        </p>
        {teams.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            لا يوجد لاعبون بعد — أضف أول لاعب أدناه.
          </p>
        ) : (
          teams.map((team) => {
            const entry = team.members[0];
            return (
              <div key={team.id} className="flex items-center gap-2 flex-wrap py-1">
                <PlayerAvatar
                  photo={entry?.member.photo ?? null}
                  fullName={entry?.member.fullName ?? team.name}
                />
                <span className="text-sm font-bold min-w-0 flex-1">
                  {entry?.member.fullName ?? team.name}
                  {entry?.status === "PENDING" && (
                    <span className="badge badge-pending text-xs mr-2">طلب انضمام</span>
                  )}
                </span>
                {entry?.status === "PENDING" && (
                  <button
                    onClick={() =>
                      run(
                        () => api.patch(`/api/admin/teams/${team.id}/members/${entry.member.id}`),
                        "قُبل اللاعب",
                      )
                    }
                    disabled={busy}
                    className="text-xs px-3 py-1.5 rounded-lg font-bold"
                    style={{ background: "var(--mint-600)", color: "white" }}
                  >
                    قبول الانضمام
                  </button>
                )}
                {hasGroups && (
                  <select
                    value={team.groupId ?? ""}
                    onChange={(e) =>
                      run(
                        () =>
                          api.patch(`/api/admin/teams/${team.id}`, {
                            groupId: e.target.value || null,
                          }),
                        "نُقل اللاعب",
                      )
                    }
                    disabled={busy}
                    aria-label={`مجموعة ${entry?.member.fullName ?? team.name}`}
                    className="input input-sm"
                    style={{ width: "auto" }}
                  >
                    <option value="">بلا مجموعة</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => removePlayer(team)}
                  disabled={busy}
                  aria-label={`إزالة ${entry?.member.fullName ?? team.name}`}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "#fee2e2", color: "#991b1b" }}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="card p-4 space-y-2">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="plus">إضافة لاعب</IconLabel>
        </p>
        {candidates.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            كل المسجلين في النشاط مضافون بالفعل.
          </p>
        ) : (
          <>
            <input
              type="text"
              placeholder="بحث بالاسم أو الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input text-sm"
            />
            <div className="flex gap-2">
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                aria-label="اختيار اللاعب"
                className="input input-sm flex-1"
              >
                <option value="">اختر لاعباً...</option>
                {filtered.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
              <button
                onClick={addPlayer}
                disabled={busy || !selected}
                className="btn btn-sm btn-primary disabled:opacity-40"
              >
                {busy ? "..." : "إضافة"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
