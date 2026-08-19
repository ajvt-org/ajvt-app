"use client";

import NumericRanges from "@/components/NumericRanges";
import type { ScoreCurve } from "@/lib/competitionConfig";
import { countedNoun, POINTS, ROUNDS, SECONDS } from "@/lib/arabicPlural";

export default function ScoreFormula({
  curve,
  boards,
}: {
  curve: ScoreCurve;
  boards: { title: string; blockRounds: number; counting: number; wholeRun: boolean }[];
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
          <NumericRanges>{`حتى ${countedNoun(curve.fullSeconds, SECONDS)}، كل النقاط`}</NumericRanges>
        </li>
        <li>
          <NumericRanges>
            {`من ${curve.fullSeconds} إلى ${countedNoun(curve.maxSeconds, SECONDS)}، تنزل من 100 بالمئة إلى ${curve.floorPercent} بالمئة`}
          </NumericRanges>
        </li>
        <li>
          <NumericRanges>
            {`بعد ${countedNoun(curve.maxSeconds, SECONDS)} يُغلق السؤال ويحتسب متروكاً بصفر`}
          </NumericRanges>
        </li>
      </ul>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        <NumericRanges>
          {`مثال، سؤال من 20 نقطة أُجيب صحيحاً في منتصف المدة يأخذ ${countedNoun(example, POINTS)}.`}
        </NumericRanges>
      </p>
      <ul className="text-xs space-y-1" style={{ color: "var(--text-muted)" }}>
        {boards.map((board) => (
          <li key={board.title}>
            <NumericRanges>
              {board.wholeRun
                ? `${board.title}، مجموع كل جولات المسابقة`
                : board.blockRounds === 1
                  ? `${board.title}، كل جولة وحدها`
                  : `${board.title}، أفضل ${countedNoun(board.counting, ROUNDS)} من ${board.blockRounds}`}
            </NumericRanges>
          </li>
        ))}
      </ul>
    </div>
  );
}
