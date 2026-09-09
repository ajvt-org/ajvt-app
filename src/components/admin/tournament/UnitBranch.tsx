"use client";

import { useState } from "react";
import { seriesResult as texts } from "@/lib/texts";
import { recordsOnItself } from "@/lib/matchLevels";
import { offerableRules } from "@/lib/moveRules";
import MatchMoves from "./MatchMoves";
import UnitBlock from "./UnitBlock";
import UnitEditor, { EMPTY_DRAFT, bodyOf, draftOf, type UnitDraft } from "./UnitEditor";
import { UnitsEmpty } from "./UnitRow";
import { movesOn, recordingAt, type EditorApi } from "./unitEditorApi";
import type { UnitRow } from "./seriesTypes";

export default function UnitBranch({
  api,
  parentId,
  depth,
  units,
  full,
}: {
  api: EditorApi;
  parentId: string | null;
  depth: number;
  units: UnitRow[];
  full: boolean;
}) {
  const [draft, setDraft] = useState<UnitDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);

  const recording = recordingAt(api, depth);
  if (!recording) return null;

  const { level, parent } = recording;
  const own = recordsOnItself(api.ladder);
  const editable = api.open && !full;
  const rules = offerableRules(api.rules, [level.id]);

  function submit() {
    const body = bodyOf(draft, parent);
    if (editingId) api.onCorrect(editingId, body);
    else api.onAdd(parentId, body);
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
  }

  return (
    <div className="space-y-1.5">
      {units.length === 0 ? (
        own ? null : (
          <UnitsEmpty />
        )
      ) : (
        units.map((unit) => (
          <UnitBlock
            key={unit.id}
            api={api}
            unit={unit}
            depth={depth}
            editing={editingId === unit.id}
            draft={draft}
            onDraft={setDraft}
            onEdit={() => {
              setEditingId(unit.id);
              setDraft(draftOf(unit));
            }}
            onCancel={() => {
              setEditingId(null);
              setDraft(EMPTY_DRAFT);
            }}
            onSubmit={submit}
          />
        ))
      )}

      {rules.length > 0 && units.length > 0 && (
        <MatchMoves
          rules={rules}
          recorded={movesOn(api, units)}
          sides={api.sides}
          unit={level}
          units={units}
          busy={api.busy}
          open={api.open}
          onRecord={api.onRecordMove}
          onUndo={api.onUndoMove}
        />
      )}

      {editable && editingId === null && (
        <UnitEditor
          draft={draft}
          level={level}
          parent={parent}
          addLabel={own ? texts.recordResult : undefined}
          sides={api.sides}
          busy={api.busy}
          editing={false}
          onChange={setDraft}
          onSubmit={submit}
          onCancel={() => setDraft(EMPTY_DRAFT)}
        />
      )}

      {!editable && units.length > 0 && api.open && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.takesNoMore}
        </p>
      )}
    </div>
  );
}
