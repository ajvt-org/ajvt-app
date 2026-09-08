"use client";

import IconLabel from "@/components/IconLabel";
import { donorNameChoice as texts } from "@/lib/texts";

function choiceStyle(picked: boolean) {
  return {
    background: picked ? "var(--mint-600)" : "white",
    color: picked ? "white" : "var(--mint-700)",
    borderColor: picked ? "var(--mint-600)" : "var(--mint-200)",
  };
}

function noteFor(wantsName: boolean | null): string {
  if (wantsName === true) return texts.namedNote;
  if (wantsName === false) return texts.anonymousNote;
  return texts.unansweredNote;
}

export default function DonorNameChoice({
  wantsName,
  onPick,
  memberName,
}: {
  wantsName: boolean | null;
  onPick: (wants: boolean) => void;
  memberName?: string;
}) {
  return (
    <div>
      <p
        id="donate-named-label"
        className="block text-sm font-bold mb-2"
        style={{ color: "var(--text-main)" }}
      >
        {texts.question}
      </p>
      <div
        className="grid grid-cols-2 gap-2"
        role="radiogroup"
        aria-labelledby="donate-named-label"
      >
        <button
          type="button"
          role="radio"
          aria-checked={wantsName === true}
          onClick={() => onPick(true)}
          className="py-3 rounded-xl text-sm font-bold transition-all border-2"
          style={choiceStyle(wantsName === true)}
        >
          <IconLabel name="pencil">{memberName ? texts.yesNamed(memberName) : texts.yes}</IconLabel>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={wantsName === false}
          onClick={() => onPick(false)}
          className="py-3 rounded-xl text-sm font-bold transition-all border-2"
          style={choiceStyle(wantsName === false)}
        >
          <IconLabel name="lock">{texts.no}</IconLabel>
        </button>
      </div>

      <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
        {noteFor(wantsName)}
      </p>
    </div>
  );
}
