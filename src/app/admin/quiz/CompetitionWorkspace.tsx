"use client";

import { useState } from "react";
import WorkspaceTabs from "@/components/admin/WorkspaceTabs";
import CompetitionPanel from "./CompetitionPanel";
import ParticipantsPanel from "./ParticipantsPanel";
import RoundsPanel from "./RoundsPanel";
import ScoresPanel from "./ScoresPanel";
import StandingsPanel from "./StandingsPanel";
import { competitionTabSections, openingTab } from "./competitionTabs";
import { roundInPlay } from "@/lib/quizRound";
import type { CompetitionRow } from "./competitionTypes";

export default function CompetitionWorkspace({
  competitionId,
  competition,
  banks,
  onSaved,
  onChanged,
  onDeleted,
}: {
  competitionId: string | null;
  competition: CompetitionRow | null;
  banks: { id: string; name: string }[];
  onSaved: (id: string) => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);

  const shape = competitionId ? competition : null;
  const sections = competitionTabSections(shape);
  const tabs = sections.flatMap((section) => section.tabs);
  const wanted = picked ?? openingTab(shape);
  const active = tabs.some((tab) => tab.key === wanted) ? wanted : tabs[0].key;
  const startRound = shape
    ? roundInPlay(
        {
          startsAt: new Date(shape.startsAt),
          roundCount: shape.roundCount,
          roundPeriodMinutes: shape.roundPeriodMinutes,
          roundWindowMinutes: shape.roundWindowMinutes,
        },
        new Date(),
      )
    : 0;

  return (
    <div className="space-y-3">
      {tabs.length > 1 && <WorkspaceTabs sections={sections} active={active} onPick={setPicked} />}

      {active === "settings" && (
        <CompetitionPanel
          banks={banks}
          competitionId={competitionId}
          onSaved={onSaved}
          onChanged={onChanged}
          onDeleted={onDeleted}
        />
      )}

      {active === "participants" && competitionId && shape && (
        <ParticipantsPanel competitionId={competitionId} locked={shape.startedAt !== null} />
      )}

      {active === "rounds" && competitionId && <RoundsPanel competitionId={competitionId} />}

      {active === "standings" && competitionId && <StandingsPanel competitionId={competitionId} />}

      {active === "scores" && competitionId && shape && (
        <ScoresPanel
          competitionId={competitionId}
          roundCount={shape.roundCount}
          startRound={startRound}
        />
      )}
    </div>
  );
}
