export interface PaymentMethodChoice {
  name: string;
  memberFacing: boolean;
}

export function withHeldMethod(
  methods: PaymentMethodChoice[],
  held?: string | null,
): PaymentMethodChoice[] {
  const kept = held?.trim();
  if (!kept || methods.some((method) => method.name === kept)) return methods;
  return [...methods, { name: kept, memberFacing: false }];
}

export function methodChoiceNames(methods: PaymentMethodChoice[]): string[] {
  return methods.map((method) => method.name);
}
