"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import PhotoUpload from "@/components/PhotoUpload";
import InlineRename from "./InlineRename";
import { MATCH_TEAMS_SIZES } from "@/components/tournament/matchCard/MatchTeams";
import { teamsTab } from "@/lib/texts";

export const CREST = MATCH_TEAMS_SIZES.lg.logo;
export const CREST_GUTTER = 12;
const NAME_LINE = 24;
export const ONTO_FIRST_LINE = (CREST - NAME_LINE) / 2;

function keepTheCardStill(e: React.MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

export default function TeamIdentityEditor({
  name,
  shownName,
  logo,
  busy,
  controls,
  onRenameTeam,
  onSetLogo,
  children,
}: {
  name: string;
  shownName: string;
  logo: string | null;
  busy: boolean;
  controls: React.ReactNode;
  onRenameTeam: (name: string) => void;
  onSetLogo: (filename: string) => Promise<void>;
  children: React.ReactNode;
}) {
  const [renaming, setRenaming] = useState(false);

  return (
    <div className="flex items-start" style={{ gap: CREST_GUTTER }}>
      <span className="shrink-0" onClick={keepTheCardStill}>
        <PhotoUpload
          photo={logo}
          imageUrlPrefix="/api/files/team"
          variant="avatar"
          size={CREST}
          bare
          label={teamsTab.changeTeamLogo}
          placeholderIcon="shield"
          onUpload={onSetLogo}
        />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        {renaming ? (
          <span className="flex" onClick={keepTheCardStill}>
            <InlineRename
              value={name}
              maxLength={40}
              busy={busy}
              onSave={(next) => {
                onRenameTeam(next);
                setRenaming(false);
              }}
              onCancel={() => setRenaming(false)}
            />
          </span>
        ) : (
          <div className="flex items-start gap-2">
            <p
              className="min-w-0 flex-1 font-black text-base leading-6 optical-name"
              style={{
                color: "var(--text-main)",
                overflowWrap: "anywhere",
                marginBlockStart: ONTO_FIRST_LINE,
              }}
            >
              {shownName}
            </p>
            <span
              className="h-6 flex items-center shrink-0"
              style={{ marginBlockStart: ONTO_FIRST_LINE }}
            >
              <button
                onClick={(e) => {
                  keepTheCardStill(e);
                  setRenaming(true);
                }}
                disabled={busy}
                aria-label={teamsTab.renameTeam}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
              >
                <Icon name="pencil" size={14} />
              </button>
            </span>
            {controls}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
