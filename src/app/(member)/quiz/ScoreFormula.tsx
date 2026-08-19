"use client";

import type { SpeedBand } from "@/lib/competitionConfig";

export default function ScoreFormula({
  bands,
  groupSize,
  countingRounds,
}: {
  bands: SpeedBand[];
  groupSize: number;
  countingRounds: number;
}) {
  return (
    <div className="card p-4 space-y-2">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        كيف تُحتسب النقاط
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        الإجابة الصحيحة تأخذ نقاط السؤال مضروبة في نسبة السرعة. الإجابة الخاطئة أو المتروكة تأخذ
        صفراً.
      </p>
      <ul className="text-xs space-y-1" style={{ color: "var(--text-muted)" }}>
        {bands.map((band, i) => (
          <li key={i}>
            {band.maxSeconds === null
              ? `بعد ذلك ${band.percent} بالمئة`
              : `خلال ${band.maxSeconds} ثانية ${band.percent} بالمئة`}
          </li>
        ))}
      </ul>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        مثال، سؤال من 20 نقطة أُجيب صحيحاً في {bands[0]?.maxSeconds ?? 10} ثانية يأخذ{" "}
        {Math.round((20 * (bands[0]?.percent ?? 100)) / 100)} نقطة.
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        مجموع المجموعة يحتسب أفضل {countingRounds} جولة من {groupSize}، والمجموع العام هو حاصل جمع
        المجموعات.
      </p>
    </div>
  );
}
