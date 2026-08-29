export { isArabicName } from "@/lib/arabicName";

export interface FormValues {
  fullName: string;
  phone: string;
  village: string;
  age: string;
  paymentMethod: string;
  paidAmount: string;
  referenceCode: string;
}

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export const PAYMENT_CODES: Record<string, string> = {
  بنكيلي: "027217",
  السداد: "08493",
  مصرفي: "037940",
};

export const DRAFT_KEY = "ajvt_form_draft";

export const STEPS_NEW = [1, 2, 3] as const;
export const STEPS_AUTHENTICATED = [1, 3] as const;
