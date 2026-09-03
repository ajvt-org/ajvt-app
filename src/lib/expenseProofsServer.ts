export const EXPENSE_PROOF_SELECT = {
  proofs: { select: { filename: true }, orderBy: { createdAt: "asc" } },
} as const;
