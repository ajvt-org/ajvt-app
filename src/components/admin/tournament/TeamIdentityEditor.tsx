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
  onRenameTeam,
  onSetLogo,
}: {
  name: string;
  logo: string | null;
  busy: boolean;
  onRenameTeam: (name: string) => void;
  onSetLogo: (filename: string) => Promise<void>;
}) {
  const [renaming, setRenaming] = useState(false);

  return (
    <div className="space-y-2">
      <PhotoUpload
        photo={logo}
        imageUrlPrefix="/api/files/team"
        variant="avatar"
        label={teamsTab.teamLogo}
        placeholderIcon="shield"
        onUpload={onSetLogo}
      />
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
    </div>
  );
}
