export interface PaymentValues {
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
