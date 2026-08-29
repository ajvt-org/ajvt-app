"use client";

import Link from "next/link";
import ArrowLabel from "@/components/ArrowLabel";
import ErrorNotice from "@/components/form/ErrorNotice";
import PhoneInput from "@/components/form/PhoneInput";
import { memberForm, signUp } from "@/lib/texts";

export default function StepCredentials({
  phone,
  password,
  confirmPassword,
  onPhone,
  onPassword,
  onConfirmPassword,
  error,
  onNext,
}: {
  phone: string;
  password: string;
  confirmPassword: string;
  onPhone: (value: string) => void;
  onPassword: (value: string) => void;
  onConfirmPassword: (value: string) => void;
  error: string;
  onNext: () => void;
}) {
  return (
    <div className="space-y-5 fade-up delay-1">
      <div>
        <label
          htmlFor="signup-phone"
          className="block text-sm font-bold mb-1.5"
          style={{ color: "var(--text-main)" }}
        >
          {memberForm.phoneLabel} <span style={{ color: "var(--copper-500)" }}>*</span>
        </label>
        <PhoneInput id="signup-phone" value={phone} onChange={onPhone} />
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          {memberForm.phoneHint}
        </p>
      </div>

      <div>
        <label
          htmlFor="signup-password"
          className="block text-sm font-bold mb-1.5"
          style={{ color: "var(--text-main)" }}
        >
          {signUp.passwordLabel} <span style={{ color: "var(--copper-500)" }}>*</span>
        </label>
        <input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => onPassword(e.target.value)}
          placeholder={signUp.passwordPlaceholder}
          className="input"
        />
      </div>

      <div>
        <label
          htmlFor="signup-confirm"
          className="block text-sm font-bold mb-1.5"
          style={{ color: "var(--text-main)" }}
        >
          {signUp.confirmLabel} <span style={{ color: "var(--copper-500)" }}>*</span>
        </label>
        <input
          id="signup-confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => onConfirmPassword(e.target.value)}
          placeholder={signUp.passwordPlaceholder}
          className="input"
        />
      </div>

      <ErrorNotice error={error} />

      <button type="button" onClick={onNext} className="btn btn-primary mt-2">
        <ArrowLabel>{signUp.next}</ArrowLabel>
      </button>

      <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
        {signUp.haveAccount}{" "}
        <Link href="/login" className="font-bold" style={{ color: "var(--mint-600)" }}>
          {signUp.signIn}
        </Link>
      </p>
    </div>
  );
}
