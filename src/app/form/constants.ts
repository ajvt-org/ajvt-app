export interface FormValues {
  fullName: string;
  phone: string;
  age: string;
  paymentMethod: string;
  paidAmount: string;
  referenceCode: string;
}

// Auto-logout after this long with no click/keypress/scroll/touch.
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export const PAYMENT_CODES: Record<string, string> = {
  بنكيلي: "027217",
  السداد: "08493",
  مصرفي: "037940",
};

// Filling this form legitimately means leaving the app to pay, then coming
// back — long enough to trip the 30-minute idle logout. Autosaving the text
// fields (not the proof photo, too large for localStorage, nor the
// password, too sensitive) means that doesn't silently wipe out what the
// member already typed.
export const DRAFT_KEY = "ajvt_form_draft";

export const DEFAULT_AGES = [
  "البدريين",
  "الفائزين",
  "النجميين",
  "المجاهدين",
  "المنصورين",
  "الخاشعين",
  "التائبين",
];

// New registrations walk 3 steps (info → account → payment). Someone who
// already has an account (returning to add another member, or resuming
// mid-flow right after step 2 created one) skips straight past step 2 —
// there's nothing left to create.
export const STEPS_NEW = [1, 2, 3] as const;
export const STEPS_AUTHENTICATED = [1, 3] as const;

export function isArabicName(value: string): boolean {
  return /^[؀-ۿ\s]+$/.test(value.trim());
}
