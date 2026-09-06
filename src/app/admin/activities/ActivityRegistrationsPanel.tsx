"use client";

import { useState } from "react";
import { matchesSearch, searchTokens } from "@/lib/arabicText";
import { activityRegistrants as texts } from "@/lib/texts";
import PendingRegistrationCard from "./PendingRegistrationCard";
import ConfirmedRegistrantCard from "./ConfirmedRegistrantCard";
import RegistrantSection from "./RegistrantSection";
import AddMemberToActivityForm from "./AddMemberToActivityForm";
import FilterChips from "./FilterChips";
import TeamFilter from "./TeamFilter";
import { NOTHING_PICKED, hasTeamFilter, inTeam } from "./registrantFilter";
import { NEWEST_FIRST, byRequestedDate, sortOptions } from "./registrationRecord";
import type { Registration, MemberOption } from "./activityTypes";

function registrantText(r: Registration, singles: boolean): string {
  const team = singles ? "" : (r.team?.name ?? "");
  return `${r.member.fullName} ${r.member.phone ?? ""} ${team}`;
}

export default function ActivityRegistrationsPanel({
  activityId,
  registrations,
  members,
  teams,
  singles,
  actionLoading,
  onReview,
  onRegister,
  onUnregister,
}: {
  activityId: string;
  registrations: Registration[];
  members: MemberOption[];
  teams: { id: string; name: string }[];
  singles: boolean;
  actionLoading: boolean;
  onReview: (
    activityId: string,
    registrationId: string,
    status: "ACTIVE" | "REJECTED",
    reason?: string,
  ) => Promise<boolean>;
  onRegister: (activityId: string, userId: string) => Promise<boolean>;
  onUnregister: (activityId: string, userId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [team, setTeam] = useState(NOTHING_PICKED);
  const [order, setOrder] = useState(NEWEST_FIRST);

  const tokens = searchTokens(search);
  const inChosenTeam = registrations.filter((r) => inTeam(r, team));
  const shown = tokens.length
    ? inChosenTeam.filter((r) => matchesSearch(registrantText(r, singles), tokens))
    : inChosenTeam;

  const ordered = byRequestedDate(shown, order);
  const pending = ordered.filter((r) => r.status === "PENDING");
  const active = ordered.filter((r) => r.status === "ACTIVE");
  const registeredIds = new Set(
    registrations.filter((r) => r.status !== "REJECTED").map((r) => r.member.id),
  );

  return (
    <div className="mt-3 pt-3 space-y-3" style={{ borderTop: "1px solid var(--mint-100)" }}>
      <AddMemberToActivityForm
        activityId={activityId}
        candidates={members}
        registeredIds={registeredIds}
        actionLoading={actionLoading}
        onRegister={onRegister}
      />

      <input
        type="text"
        placeholder={singles ? texts.searchPlayers : texts.searchRegistrants}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input text-sm"
      />

      <FilterChips
        options={sortOptions()}
        value={order}
        onPick={setOrder}
        label={texts.sortByRequested}
      />

      {!singles && teams.length > 0 && (
        <TeamFilter teams={teams} selection={team} onChange={setTeam} />
      )}

      {pending.length > 0 && (
        <RegistrantSection icon="clock" title={texts.pending} count={pending.length}>
          <div className="space-y-2">
            {pending.map((r) => (
              <PendingRegistrationCard
                key={r.id}
                activityId={activityId}
                registration={r}
                singles={singles}
                actionLoading={actionLoading}
                onReview={onReview}
              />
            ))}
          </div>
        </RegistrantSection>
      )}

      <RegistrantSection icon="check" title={texts.confirmed} count={active.length}>
        {active.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {tokens.length || hasTeamFilter(team) ? texts.noneMatch : texts.noneConfirmed}
          </p>
        ) : (
          <div className="space-y-1.5">
            {active.map((r) => (
              <ConfirmedRegistrantCard
                key={r.id}
                registration={r}
                singles={singles}
                onUnregister={(userId) => onUnregister(activityId, userId)}
              />
            ))}
          </div>
        )}
      </RegistrantSection>
    </div>
  );
}
