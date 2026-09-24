export const AMOUNT_OPS = ["eq", "lt", "gt"] as const;

export type AmountOp = (typeof AMOUNT_OPS)[number];

export interface AmountFilter {
  op: AmountOp;
  figure: string;
}

export const NO_AMOUNT: AmountFilter = { op: "gt", figure: "" };

const SEPARATOR = ":";

export function amountFigure(filter: AmountFilter): number | null {
  const figure = filter.figure.trim();
  if (!/^\d+$/.test(figure)) return null;
  return Number(figure);
}

export function amountIsSet(filter: AmountFilter): boolean {
  return amountFigure(filter) !== null;
}

function readOp(raw: string): AmountOp | null {
  return AMOUNT_OPS.includes(raw as AmountOp) ? (raw as AmountOp) : null;
}

export function readAmountFilter(raw: string | null): AmountFilter {
  if (!raw) return NO_AMOUNT;
  const [op, figure = ""] = raw.split(SEPARATOR);
  const read = { op: readOp(op) ?? NO_AMOUNT.op, figure };
  return readOp(op) && amountIsSet(read) ? read : NO_AMOUNT;
}

export function writeAmountFilter(filter: AmountFilter): string {
  const figure = amountFigure(filter);
  return figure === null ? "" : `${filter.op}${SEPARATOR}${figure}`;
}

export function matchesAmount(amount: number | null | undefined, filter: AmountFilter): boolean {
  const figure = amountFigure(filter);
  if (figure === null) return true;
  if (amount === null || amount === undefined) return false;
  if (filter.op === "lt") return amount < figure;
  if (filter.op === "gt") return amount > figure;
  return amount === figure;
}
