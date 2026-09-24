import { counted } from "@/lib/arabicCount";
import { MINUTE } from "@/lib/messages";
import { endsAt } from "@/lib/election";
import { durationLabel, electionAdmin as texts } from "@/lib/texts";
import { Fact, Moment } from "./ElectionFieldParts";
import SettingRow from "./SettingRow";
import type { ElectionDraft } from "./electionTypes";

export default function FrozenElectionFields({
  draft,
  onChange,
}: {
  draft: ElectionDraft;
  onChange: <K extends keyof ElectionDraft>(key: K, value: ElectionDraft[K]) => void;
}) {
  return (
    <>
      <Fact label={texts.title} value={draft.title} />
      <SettingRow label={texts.hidden} checked={draft.hidden} />
      <Moment label={texts.startsAt} at={draft.startsAt} />
      <Fact
        label={texts.duration}
        value={durationLabel(draft.durationMinutes, (minutes) => counted(minutes, MINUTE))}
      />
      <Moment label={texts.closesAt} at={endsAt(draft)} />
      <SettingRow label={texts.allowBlank} checked={draft.allowBlank} />
      <SettingRow label={texts.shuffle} checked={draft.shuffleCandidates} />
      <SettingRow
        label={texts.showResults}
        checked={draft.showResults}
        onChange={(next) => onChange("showResults", next)}
      />
    </>
  );
}
