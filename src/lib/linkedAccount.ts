export function linkedAccount<T extends { userId: string }>(
  accounts: T[],
  userId: string | null | undefined,
): T | undefined {
  if (!userId) return undefined;
  return accounts.find((account) => account.userId === userId);
}
