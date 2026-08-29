export const paymentCard = {
  statusPending: "قيد الانتظار",
  statusActive: "مقبول",
  statusRejected: "مرفوض",
  membership: "عضوية الرابطة",
  generalSupport: "دعم عام للرابطة",
  linked: "مرتبط بعضو",
  hiddenOnBoard: "مخفي على اللوحة",
  storedName: (name: string) => `الاسم المكتوب: ${name}`,
  receipt: "وصل",
  receiptActive: "ساري",
  receiptVoid: "ملغى",
  uploadedAt: (date: string, time: string) => `رُفعت بتاريخ ${date} — ${time}`,
  history: "السجل",
} as const;

export const PROOF_STATUS_LABEL: Record<string, string> = {
  PENDING: paymentCard.statusPending,
  ACTIVE: paymentCard.statusActive,
  REJECTED: paymentCard.statusRejected,
};

export const RECEIPT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: paymentCard.receiptActive,
  VOID: paymentCard.receiptVoid,
};
