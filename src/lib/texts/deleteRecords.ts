import { RETENTION_DAYS } from "../deletedRecords";

export const deleteMember = {
  payment: "حذف الدفع نهائياً",
  person: "حذف الشخص نهائياً",
  paymentConsequence: (name: string) =>
    `يُحذف دفع ${name} وحده. يبقى الحساب والشخص وبياناته كما هي، ويمكنه إرسال دفع جديد.`,
  personConsequence: (name: string) =>
    `يُحذف ${name} بالكامل، حسابه ودفعه وكل ما يتعلق بهما. يمكن استرجاعه خلال ${RETENTION_DAYS} يوماً.`,
} as const;

export const confirmDelete = {
  title: "حذف نهائي",
  proceed: "متابعة",
  typeToConfirm: (name: string) => `اكتب ${name} للتأكيد.`,
  nameField: "اسم العضو للتأكيد",
  confirm: "حذف نهائي",
  accountConsequence: (name: string) =>
    `سيُحذف ${name} من القائمة. يمكن استرجاعه خلال ${RETENTION_DAYS} يوماً، وبعدها يُمحى نهائياً.`,
} as const;
