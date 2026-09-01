"use client";

import { useState } from "react";
import { matchesSearch, searchTokens } from "@/lib/arabicText";
import { activityRegistrants as texts } from "@/lib/texts";
import PendingRegistrationCard from "./PendingRegistrationCard";
import ConfirmedRegistrantCard from "./ConfirmedRegistrantCard";
import RegistrantSection from "./RegistrantSection";
import AddMemberToActivityForm from "./AddMemberToActivityForm";
import FilterChips from "./FilterChips";
import { ALL_TEAMS, inTeam, teamFilterOptions } from "./registrantFilter";
import type { Registration, MemberOption } from "./activityTypes";

function registrantText(r: Registration): string {
  return `${r.member.fullName} ${r.member.phone ?? ""} ${r.team?.name ?? ""}`;
}

export default function ActivityRegistrationsPanel({
  activityId,
  registrations,
  members,
  teams,
  actionLoading,
  onReview,
  onRegister,
  onUnregister,
}: {
  activityId: string;
  registrations: Registration[];
  members: MemberOption[];
  teams: { id: string; name: string }[];
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
  const [team, setTeam] = useState(ALL_TEAMS);

  const tokens = searchTokens(search);
  const inChosenTeam = registrations.filter((r) => inTeam(r, team));
  const shown = tokens.length
    ? inChosenTeam.filter((r) => matchesSearch(registrantText(r), tokens))
    : inChosenTeam;

  const pending = shown.filter((r) => r.status === "PENDING");
  const active = shown.filter((r) => r.status === "ACTIVE");
  const registeredIds = new Set(
    registrations.filter((r) => r.status !== "REJECTED").map((r) => r.member.id),
  );
  const candidates = members.filter((m) => !registeredIds.has(m.id));

  return (
    <div className="mt-3 pt-3 space-y-3" style={{ borderTop: "1px solid var(--mint-100)" }}>
      <AddMemberToActivityForm
        activityId={activityId}
        candidates={candidates}
        actionLoading={actionLoading}
        onRegister={onRegister}
      />

      <input
        type="text"
        placeholder={texts.searchRegistrants}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input text-sm"
      />

      {teams.length > 0 && (
        <FilterChips
          options={teamFilterOptions(teams)}
          value={team}
          onPick={setTeam}
          label={texts.filterByTeam}
        />
      )}

      {pending.length > 0 && (
        <RegistrantSection icon="clock" title={texts.pending} count={pending.length}>
          <div className="space-y-2">
            {pending.map((r) => (
              <PendingRegistrationCard
                key={r.id}
                activityId={activityId}
                registration={r}
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
            {tokens.length || team !== ALL_TEAMS ? texts.noneMatch : texts.noneConfirmed}
          </p>
        ) : (
          <div className="space-y-1.5">
            {active.map((r) => (
              <ConfirmedRegistrantCard
                key={r.id}
                registration={r}
                onUnregister={(userId) => onUnregister(activityId, userId)}
              />
            ))}
          </div>
        )}
      </RegistrantSection>
    </div>
  );
}
