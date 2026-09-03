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

export interface PaymentMethodOption {
  id: string;
  name: string;
  memberFacing: boolean;
  active: boolean;
  position: number;
}

function byPosition(a: PaymentMethodOption, b: PaymentMethodOption): number {
  return a.position - b.position || a.name.localeCompare(b.name);
}

export function inOrder(methods: PaymentMethodOption[]): PaymentMethodOption[] {
  return [...methods].sort(byPosition);
}

export function offeredMethods(methods: PaymentMethodOption[]): PaymentMethodOption[] {
  return inOrder(methods).filter((method) => method.active);
}

export function memberMethods(methods: PaymentMethodOption[]): PaymentMethodOption[] {
  return offeredMethods(methods).filter((method) => method.memberFacing);
}

export function methodNames(methods: PaymentMethodOption[]): string[] {
  return methods.map((method) => method.name);
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
