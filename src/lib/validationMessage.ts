// The browser writes "Please fill in this field" in its own UI language, not
// the page's, so an arabic-speaking member on an english phone gets a message
// they can't read exactly when they're stuck. setCustomValidity replaces it;
// clearing on input lets the field validate normally again.
import type { FormEvent } from "react";

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export const REQUIRED_MESSAGE = "هذا الحقل مطلوب";

export function arabicValidity(message: string = REQUIRED_MESSAGE) {
  return {
    onInvalid: (e: FormEvent<Field>) => e.currentTarget.setCustomValidity(message),
    onInput: (e: FormEvent<Field>) => e.currentTarget.setCustomValidity(""),
  };
}
