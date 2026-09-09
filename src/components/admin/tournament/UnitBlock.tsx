"use client";

import { useState } from "react";
import { seriesResult as texts } from "@/lib/texts";
import { recordsOnItself } from "@/lib/matchLevels";
import UnitBranch from "./UnitBranch";
import UnitLine from "./UnitRow";
import UnitEditor, { type UnitDraft } from "./UnitEditor";
import { levelAt, opensOnto, recordingAt, typedScore, type EditorApi } from "./unitEditorApi";
import type { UnitRow } from "./seriesTypes";

export default function UnitBlock({
  api,
  unit,
  depth,
  editing,
  draft,
  onDraft,
  onEdit,
  onCancel,
  onSubmit,
}: {
  api: EditorApi;
  unit: UnitRow;
  depth: number;
  editing: boolean;
  draft: UnitDraft;
  onDraft: (draft: UnitDraft) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const [warning, setWarning] = useState(false);
  const { level, parent } = recordingAt(api, depth)!;
  const under = levelAt(api, depth + 1);
  const opened = api.opened.includes(unit.id);
  const nests = opensOnto(api, depth);

  function toggle() {
    if (!opened && unit.children.length === 0 && typedScore(unit)) {
      setWarning(true);
      return;
    }
    setWarning(false);
    api.onToggle(unit.id);
  }

  return (
    <div className="space-y-1.5">
      <UnitLine
        unit={unit}
        level={level}
        name={recordsOnItself(api.ladder) ? texts.resultRow : undefined}
        sides={api.sides}
        busy={api.busy}
        editable={api.open && unit.children.length === 0}
        openable={nests}
        opened={opened}
        onToggle={toggle}
        onEdit={onEdit}
        onRemove={() => api.onRemove(unit.id)}
      />

      {warning && under && (
        <div
          className="rounded-lg px-2.5 py-1.5 text-xs space-y-1.5"
          style={{ background: "#fdf2e9", color: "var(--copper-600)" }}
        >
          <p>{texts.openDiscards}</p>
          <button
            onClick={() => {
              setWarning(false);
              api.onToggle(unit.id);
            }}
            disabled={api.busy}
            className="btn btn-sm"
          >
            {texts.openAnyway}
          </button>
        </div>
      )}

      {editing && (
        <UnitEditor
          draft={draft}
          level={level}
          parent={parent}
          sides={api.sides}
          busy={api.busy}
          editing
          onChange={onDraft}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      )}

      {opened && under && (
        <div className="ps-2 ms-1" style={{ borderInlineStart: "2px solid var(--mint-100)" }}>
          <p className="text-xs font-bold mb-1" style={{ color: "var(--text-muted)" }}>
            <bdi>{under.singular}</bdi>
          </p>
          <UnitBranch
            api={api}
            parentId={unit.id}
            depth={depth + 1}
            units={unit.children}
            full={unit.standing?.over ?? false}
          />
        </div>
      )}
    </div>
  );
}
