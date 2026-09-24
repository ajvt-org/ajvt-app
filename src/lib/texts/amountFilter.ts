import type { AmountOp } from "@/lib/amountFilter";

export const amountFilter = {
  title: "المبلغ",
  operator: "مقارنة المبلغ",
  figure: "المبلغ",
} as const;

export const AMOUNT_OP_LABEL: Record<AmountOp, string> = {
  eq: "يساوي",
  lt: "أقل من",
  gt: "أكثر من",
};

export function amountChipLabel(op: AmountOp, figure: number): string {
  return `${amountFilter.title} ${AMOUNT_OP_LABEL[op]} ${figure}`;
}
