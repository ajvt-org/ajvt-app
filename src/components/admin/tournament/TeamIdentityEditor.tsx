"use client";

import { useState } from "react";
import IconLabel from "@/components/IconLabel";
import PhotoUpload from "@/components/PhotoUpload";
import InlineRename from "./InlineRename";
import { teamsTab } from "@/lib/texts";

export default function TeamIdentityEditor({
  name,
  logo,
  busy,
  askVillage,
  fromTaguilalett,
  onRenameTeam,
  onSetLogo,
  onSetFromTaguilalett,
}: {
  name: string;
  logo: string | null;
  busy: boolean;
  askVillage: boolean;
  fromTaguilalett: boolean;
  onRenameTeam: (name: string) => void;
  onSetLogo: (filename: string) => Promise<void>;
  onSetFromTaguilalett: (value: boolean) => void;
}) {
  const [renaming, setRenaming] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <PhotoUpload
        photo={logo}
        imageUrlPrefix="/api/files/team"
        variant="avatar"
        bare
        label={teamsTab.changeTeamLogo}
        placeholderIcon="shield"
        onUpload={onSetLogo}
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        {renaming ? (
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
        ) : (
          <button
            onClick={() => setRenaming(true)}
            className="text-xs px-3 py-1.5 rounded-lg font-bold"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            <IconLabel name="pencil">{teamsTab.renameTeam}</IconLabel>
          </button>
        )}
        {askVillage && (
          <label className="flex items-center gap-2 text-xs font-bold">
            <input
              type="checkbox"
              checked={fromTaguilalett}
              disabled={busy}
              onChange={(e) => onSetFromTaguilalett(e.target.checked)}
            />
            <span style={{ color: "var(--text-main)" }}>{teamsTab.fromTaguilalett}</span>
          </label>
        )}
      </div>
    </div>
  );
}
