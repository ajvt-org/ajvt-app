export interface PaymentAccountChoice {
  id: string;
  code: string;
  label: string | null;
}

export interface PaymentMethodChoice {
  name: string;
  memberFacing: boolean;
  accounts: PaymentAccountChoice[];
}

export function withHeldMethod(
  methods: PaymentMethodChoice[],
  held?: string | null,
): PaymentMethodChoice[] {
  const kept = held?.trim();
  if (!kept || methods.some((method) => method.name === kept)) return methods;
  return [...methods, { name: kept, memberFacing: false, accounts: [] }];
}

export function methodChoiceNames(methods: PaymentMethodChoice[]): string[] {
  return methods.map((method) => method.name);
}

export function accountsOfMethod(
  methods: PaymentMethodChoice[],
  name: string | null | undefined,
): PaymentAccountChoice[] {
  const kept = name?.trim();
  if (!kept) return [];
  return methods.find((method) => method.name === kept)?.accounts ?? [];
}

export function withHeldAccount(
  accounts: PaymentAccountChoice[],
  held: PaymentAccountChoice | null | undefined,
): PaymentAccountChoice[] {
  if (!held || accounts.some((account) => account.id === held.id)) return accounts;
  return [...accounts, held];
}

export function accountToPreselect(
  accounts: PaymentAccountChoice[],
  declared: string | null | undefined,
): string {
  const said = declared?.trim();
  if (said) return accounts.some((account) => account.id === said) ? said : "";
  return accounts.length === 1 ? accounts[0].id : "";
}
