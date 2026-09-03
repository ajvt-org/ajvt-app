import { paidBreakdown } from "@/lib/paidBreakdown";
import Money from "@/components/Money";
import { paidAmount as texts } from "@/lib/texts/paidAmount";

export default function PaidAmountRows({
  paidAmount,
  supportAmount,
  Row,
}: {
  paidAmount: number | null;
  supportAmount: number;
  Row: (props: { label: string; value: React.ReactNode }) => React.ReactNode;
}) {
  const breakdown = paidBreakdown(paidAmount, supportAmount);
  if (!breakdown) return null;

  if (breakdown.support === 0) {
    return <Row label={texts.paid} value={<Money value={breakdown.fee} />} />;
  }

  return (
    <>
      <Row label={texts.fee} value={<Money value={breakdown.fee} />} />
      <Row label={texts.support} value={<Money value={breakdown.support} />} />
      <Row label={texts.total} value={<Money value={breakdown.total} />} />
    </>
  );
}
