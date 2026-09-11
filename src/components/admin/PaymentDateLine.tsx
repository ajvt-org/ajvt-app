import { formatDateTime } from "@/lib/clubTime";
import { paymentDates } from "@/lib/texts";

export default function PaymentDateLine({
  paidOn,
  recordedAt,
}: {
  paidOn: string | null;
  recordedAt: string;
}) {
  if (paidOn)
    return (
      <span>
        {paymentDates.paidOn} <bdi dir="ltr">{formatDateTime(paidOn)}</bdi>
      </span>
    );
  return (
    <span>
      {paymentDates.recordedOn} <bdi dir="ltr">{formatDateTime(recordedAt)}</bdi>
    </span>
  );
}
