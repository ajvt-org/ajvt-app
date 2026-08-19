"use client";

import NumericRanges from "@/components/NumericRanges";
import type { ScoreCurve } from "@/lib/competitionConfig";

export default function ScoreFormula({
  curve,
  groupSize,
  countingRounds,
}: {
  curve: ScoreCurve;
  groupSize: number;
  countingRounds: number;
}) {
  const example = Math.round((20 * (100 + curve.floorPercent)) / 200);

  return (
    <div className="card p-4 space-y-2">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        كيف تُحتسب النقاط
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        الإجابة الخاطئة أو المتروكة تأخذ صفراً. الإجابة الصحيحة تأخذ نقاط السؤال كاملة إذا جاءت خلال
        الثواني الأولى، ثم تنزل تدريجياً حتى أقل نسبة عند انتهاء وقت السؤال.
      </p>
      <ul className="text-xs space-y-1" style={{ color: "var(--text-muted)" }}>
        <li>
          <NumericRanges>{`حتى ${curve.fullSeconds} ثانية، كل النقاط`}</NumericRanges>
        </li>
        <li>
          <NumericRanges>
            {`من ${curve.fullSeconds} إلى ${curve.maxSeconds} ثانية، تنزل من 100 بالمئة إلى ${curve.floorPercent} بالمئة`}
          </NumericRanges>
        </li>
        <li>
          <NumericRanges>{`بعد ${curve.maxSeconds} ثانية، ${curve.floorPercent} بالمئة`}</NumericRanges>
        </li>
      </ul>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        <NumericRanges>
          {`مثال، سؤال من 20 نقطة أُجيب صحيحاً في منتصف المدة يأخذ ${example} نقطة.`}
        </NumericRanges>
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        <NumericRanges>
          {`مجموع المجموعة يحتسب أفضل ${countingRounds} جولة من ${groupSize}، والمجموع العام هو حاصل جمع المجموعات.`}
        </NumericRanges>
      </p>
    </div>
  );
}
