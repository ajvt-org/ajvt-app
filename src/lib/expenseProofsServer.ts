export const EXPENSE_PROOF_SELECT = {
  proofs: { select: { filename: true }, orderBy: { createdAt: "asc" } },
} as const;

export const EXPENSE_ALLOCATION_SELECT = {
  allocations: {
    select: {
      id: true,
      amount: true,
      activity: { select: { id: true, title: true } },
      competition: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  },
} as const;
