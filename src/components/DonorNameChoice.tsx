"use client";

import IconLabel from "@/components/IconLabel";
import { DONOR_NAME_MAX } from "@/lib/donorChoice";

const ANONYMOUS_NOTE =
  'سيُسجَّل تبرعك باسم "فاعل خير"، فيظهر في لوحة شرف المتبرعين دون اسمك ويُحتسب ضمن مجموع الدعم.';
const NAMED_NOTE = "سنذكر اسمك تقديراً لدعمك، وسيظهر في لوحة شرف المتبرعين.";
const UNANSWERED_NOTE =
  "كلا الخيارين متاحان بنفس القدر، ويظهر تبرعك في لوحة شرف المتبرعين إما باسمك أو باسم فاعل خير.";

function choiceStyle(picked: boolean) {
  return {
    background: picked ? "var(--mint-600)" : "white",
    color: picked ? "white" : "var(--mint-700)",
    borderColor: picked ? "var(--mint-600)" : "var(--mint-200)",
  };
}

export default function DonorNameChoice({
  wantsName,
  onPick,
  donorName,
  onDonorName,
  memberName,
}: {
  wantsName: boolean | null;
  onPick: (wants: boolean) => void;
  donorName?: string;
  onDonorName?: (name: string) => void;
  memberName?: string;
}) {
  return (
    <div>
      <p
        id="donate-named-label"
        className="block text-sm font-bold mb-2"
        style={{ color: "var(--text-main)" }}
      >
        هل تريد ذكر اسمك مع التبرع؟
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
          <IconLabel name="pencil">نعم{memberName ? ` — ${memberName}` : "، باسمي"}</IconLabel>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={wantsName === false}
          onClick={() => onPick(false)}
          className="py-3 rounded-xl text-sm font-bold transition-all border-2"
          style={choiceStyle(wantsName === false)}
        >
          <IconLabel name="lock">أفضّل أن أبقى مجهولاً</IconLabel>
        </button>
      </div>

      {!memberName && wantsName === true && onDonorName && (
        <input
          type="text"
          value={donorName ?? ""}
          onChange={(e) => onDonorName(e.target.value)}
          placeholder="اكتب اسمك هنا"
          maxLength={DONOR_NAME_MAX}
          className="input mt-2"
          aria-label="اسمك"
          autoFocus
        />
      )}

      <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
        {wantsName === false ? ANONYMOUS_NOTE : wantsName === true ? NAMED_NOTE : UNANSWERED_NOTE}
      </p>
    </div>
  );
}
