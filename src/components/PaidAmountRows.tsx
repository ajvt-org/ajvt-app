import { paidBreakdown } from "@/lib/paidBreakdown";
import { ouguiya } from "@/lib/texts/currency";

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
    return <Row label="المبلغ المسدد" value={ouguiya.amount(breakdown.fee)} />;
  }

  return (
    <>
      <Row label="رسوم الاشتراك" value={ouguiya.amount(breakdown.fee)} />
      <Row label="مبلغ الدعم" value={ouguiya.amount(breakdown.support)} />
      <Row label="إجمالي ما دُفع" value={ouguiya.amount(breakdown.total)} />
    </>
  );
}
