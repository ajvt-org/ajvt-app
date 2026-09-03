import { paidBreakdown } from "@/lib/paidBreakdown";
import { ouguiya } from "@/lib/texts/currency";
import { paidAmount as texts } from "@/lib/texts/paidAmount";

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
    return <Row label={texts.paid} value={ouguiya.amount(breakdown.fee)} />;
  }

  return (
    <>
      <Row label={texts.fee} value={ouguiya.amount(breakdown.fee)} />
      <Row label={texts.support} value={ouguiya.amount(breakdown.support)} />
      <Row label={texts.total} value={ouguiya.amount(breakdown.total)} />
    </>
  );
}
