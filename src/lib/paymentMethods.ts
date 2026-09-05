export interface SeededPaymentMethod {
  name: string;
  memberFacing: boolean;
  position: number;
}

export const INITIAL_PAYMENT_METHODS: readonly SeededPaymentMethod[] = [
  { name: "بنكيلي", memberFacing: true, position: 1 },
  { name: "السداد", memberFacing: true, position: 2 },
  { name: "مصرفي", memberFacing: true, position: 3 },
  { name: "نقداً", memberFacing: false, position: 4 },
] as const;

export interface SeededPaymentAccount {
  method: string;
  code: string;
  position: number;
}

export const INITIAL_PAYMENT_ACCOUNTS: readonly SeededPaymentAccount[] = [
  { method: "بنكيلي", code: "111111", position: 1 },
  { method: "السداد", code: "22222", position: 1 },
  { method: "مصرفي", code: "333333", position: 1 },
] as const;

export interface PaymentMethodOption {
  id: string;
  name: string;
  memberFacing: boolean;
  active: boolean;
  position: number;
}

export interface PaymentAccountOption {
  id: string;
  code: string;
  label: string | null;
  position: number;
  active: boolean;
  closedAt: Date | null;
}

export interface MethodWithAccounts extends PaymentMethodOption {
  accounts: PaymentAccountOption[];
}

function byPosition(a: PaymentMethodOption, b: PaymentMethodOption): number {
  return a.position - b.position || a.name.localeCompare(b.name);
}

export function inOrder<T extends PaymentMethodOption>(methods: T[]): T[] {
  return [...methods].sort(byPosition);
}

export function offeredMethods<T extends PaymentMethodOption>(methods: T[]): T[] {
  return inOrder(methods).filter((method) => method.active);
}

export function memberMethods<T extends PaymentMethodOption>(methods: T[]): T[] {
  return offeredMethods(methods).filter((method) => method.memberFacing);
}

export function methodNames(methods: PaymentMethodOption[]): string[] {
  return methods.map((method) => method.name);
}

export function openAccounts(accounts: PaymentAccountOption[]): PaymentAccountOption[] {
  return [...accounts]
    .filter((account) => account.active && account.closedAt === null)
    .sort((a, b) => a.position - b.position || a.code.localeCompare(b.code));
}

export function acceptedNames(offered: readonly string[], held?: string | null): string[] {
  const kept = held?.trim();
  if (!kept || offered.includes(kept)) return [...offered];
  return [...offered, kept];
}

export function acceptsMethod(
  offered: readonly string[],
  value: string,
  held?: string | null,
): boolean {
  return acceptedNames(offered, held).includes(value);
}

export function accountIsOpenOn(
  method: MethodWithAccounts | undefined,
  accountId: string,
): boolean {
  return openAccounts(method?.accounts ?? []).some((account) => account.id === accountId);
}

export function payableMethods(methods: MethodWithAccounts[]): MethodWithAccounts[] {
  return memberMethods(methods).filter((method) => openAccounts(method.accounts).length > 0);
}
