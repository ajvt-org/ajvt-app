"use client";

import Icon from "@/components/Icon";
import NumericRanges from "@/components/NumericRanges";

export default function AttemptResult({
  isCorrect,
  points,
  score,
  last,
  onContinue,
}: {
  isCorrect: boolean;
  points: number;
  score: number;
  last: boolean;
  onContinue: () => void;
}) {
  return (
    <div
      className="flex flex-col min-h-[100svh] p-5 gap-4 items-center justify-center text-center"
      style={{ background: "var(--mint-50)" }}
    >
      <div style={{ color: isCorrect ? "var(--mint-600)" : "#991b1b" }}>
        <Icon name={isCorrect ? "check" : "close"} size={56} />
      </div>

      <p className="text-lg font-black" style={{ color: "var(--text-main)" }}>
        {isCorrect ? "إجابة صحيحة" : "إجابة خاطئة"}
      </p>

      {isCorrect && (
        <p className="text-sm font-bold" style={{ color: "var(--mint-700)" }}>
          <NumericRanges>{`+${points}`}</NumericRanges>
        </p>
      )}

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        <NumericRanges>{`مجموعك في الجولة ${score}`}</NumericRanges>
      </p>

      <button onClick={onContinue} className="btn btn-primary w-full max-w-xs text-sm font-bold">
        {last ? "إنهاء" : "السؤال التالي"}
      </button>
    </div>
  );
}
