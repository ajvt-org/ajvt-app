import type { FormEvent } from "react";

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export const REQUIRED_MESSAGE = "هذا الحقل مطلوب";

export function arabicValidity(message: string = REQUIRED_MESSAGE) {
  return {
    onInvalid: (e: FormEvent<Field>) => e.currentTarget.setCustomValidity(message),
    onInput: (e: FormEvent<Field>) => e.currentTarget.setCustomValidity(""),
  };
}
