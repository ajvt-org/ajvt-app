import { money as amountText } from "../money";

export const money = {
  amountInvalid: "المبلغ يجب أن يكون رقماً صحيحاً موجباً",
  paidAmountTooLow: (fee: number) => `يرجى إدخال مبلغ صحيح (${amountText(fee)} على الأقل)`,
  proofRequired: "يرجى إرفاق صورة إثبات الدفع",
  tooManyDonations: "محاولات كثيرة جداً، حاول لاحقاً",
  anonymousDonor: "فاعل خير",
  nameChoiceRequired: "يرجى اختيار كيف تظهر مساهمتك",
  nameRequired: "الاسم مطلوب",
  nameTooLong: "الاسم طويل جداً (50 حرفاً كحد أقصى)",
  paymentMethodInvalid: "طريقة دفع غير صالحة",
  paymentAccountInvalid: "رقم المستلم غير صالح",
  donationNotFound: "التبرع غير موجود",
  membershipDonationReadOnly: "هذه المساهمة جزء من انتساب العضو — عدّلها من صفحة العضو",
} as const;
