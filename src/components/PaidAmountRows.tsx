import { paidBreakdown } from "@/lib/paidBreakdown";

export default function PaidAmountRows({
  paidAmount,
  supportAmount,
  Row,
}: {
  paidAmount: number | null;
  supportAmount: number;
  Row: (props: { label: string; value: string }) => React.ReactNode;
}) {
  const breakdown = paidBreakdown(paidAmount, supportAmount);
  if (!breakdown) return null;

  if (breakdown.support === 0) {
    return <Row label="المبلغ المسدد" value={`${breakdown.fee} أوقية`} />;
  }

  return (
    <>
      <Row label="رسوم الاشتراك" value={`${breakdown.fee} أوقية`} />
      <Row label="مبلغ الدعم" value={`${breakdown.support} أوقية`} />
      <Row label="إجمالي ما دُفع" value={`${breakdown.total} أوقية`} />
    </>
  );
}
