import { moneyDigits } from "@/lib/money";
import { ouguiya } from "@/lib/texts/currency";

export default function Money({
  value,
  digitsOnly = false,
  className,
  style,
}: {
  value: number;
  digitsOnly?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (digitsOnly) {
    return (
      <bdi dir="ltr" className={className} style={style}>
        {moneyDigits(value)}
      </bdi>
    );
  }

  return (
    <bdi dir="rtl" className={className} style={style}>
      <bdi dir="ltr">{moneyDigits(value)}</bdi> {ouguiya.singular}
    </bdi>
  );
}
