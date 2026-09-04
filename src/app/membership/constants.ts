export { PAYMENT_CODES, PAYABLE_METHODS } from "@/lib/paymentCodes";

export interface PaymentValues {
  paymentMethod: string;
  paidAmount: string;
  referenceCode: string;
}

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export const DRAFT_KEY = "ajvt_form_draft";
