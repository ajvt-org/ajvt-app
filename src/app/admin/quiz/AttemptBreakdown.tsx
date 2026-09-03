"use client";

import IconLabel from "@/components/IconLabel";
import AnswerReview, { type Review } from "@/components/AnswerReview";

export interface AttemptDetail {
  attemptId: string;
  name: string;
  round: number;
  category: string | null;
  voided?: boolean;
  breakdown: Review;
}

export default function AttemptBreakdown({
  detail,
  onClose,
}: {
  detail: AttemptDetail;
  onClose: () => void;
}) {
  const { breakdown } = detail;

  return (
    <div className="rounded-lg p-3 space-y-2" style={{ background: "var(--surface-2)" }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
          {detail.name} · الجولة {detail.round + 1}
          {detail.category ? ` · ${detail.category}` : ""}
        </p>
        <button onClick={onClose} className="btn btn-sm">
          <IconLabel name="close">إغلاق</IconLabel>
        </button>
      </div>

      <AnswerReview review={breakdown} voided={detail.voided ?? false} />
    </div>
  );
}
