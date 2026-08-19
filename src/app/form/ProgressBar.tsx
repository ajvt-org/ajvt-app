"use client";

export default function ProgressBar({ stepIndex, total }: { stepIndex: number; total: number }) {
  return (
    <div className="mb-5 fade-up">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1.5 rounded-full transition-all"
            style={{ background: i <= stepIndex ? "var(--mint-600)" : "var(--mint-100)" }}
          />
        ))}
      </div>
      <p
        className="text-xs text-center mt-1.5 font-semibold"
        style={{ color: "var(--text-muted)" }}
      >
        الخطوة {stepIndex + 1} من {total}
      </p>
    </div>
  );
}
