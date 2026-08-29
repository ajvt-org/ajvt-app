export interface ReceiptForm {
  payerName: string;
  reason: string;
  amount: string;
  issuedOn: string;
}

export function todayInputValue(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function emptyReceiptForm(): ReceiptForm {
  return { payerName: "", reason: "", amount: "", issuedOn: todayInputValue() };
}
