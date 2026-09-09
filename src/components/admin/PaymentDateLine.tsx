import { formatDate, formatTime } from "@/lib/clubTime";
import { paymentDates } from "@/lib/texts";

export default function PaymentDateLine({
  paidOn,
  recordedAt,
}: {
  paidOn: string | null;
  recordedAt: string;
}) {
  if (paidOn) return <span>{paymentDates.paidOn(formatDate(paidOn))}</span>;
  return <span>{paymentDates.recordedOn(formatDate(recordedAt), formatTime(recordedAt))}</span>;
}
