"use client";

import Link from "next/link";
import ArrowLabel from "@/components/ArrowLabel";
import IconLabel from "@/components/IconLabel";
import { arabicValidity } from "@/lib/validationMessage";
import { loginPathWithNext } from "@/lib/utils";
import ErrorNotice from "./ErrorNotice";

// The one error this step reads rather than only shows: a number that is
// already registered means the visitor has an account, so offer the way in.
const ALREADY_REGISTERED = "رقم الهاتف مسجّل مسبقاً";

export default function StepAccount({
  phone,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  error,
  loading,
  onBack,
  onCreate,
}: {
  phone: string;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  error: string;
  loading: boolean;
  onBack: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="space-y-5 fade-up delay-1">
      <div className="card p-4 text-center">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="lock">أنشئ حساباً لحفظ طلبك ومتابعته لاحقاً</IconLabel>
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }} dir="ltr">
          {phone}
        </p>
      </div>

      <div>
        <label
          htmlFor="member-password"
          className="block text-sm font-bold mb-1.5"
          style={{ color: "var(--text-main)" }}
        >
          كلمة المرور <span style={{ color: "var(--copper-500)" }}>*</span>
        </label>
        <input
          id="member-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          {...arabicValidity()}
          placeholder="••••••••"
          className="input"
        />
      </div>

      <div>
        <label
          htmlFor="member-password-confirm"
          className="block text-sm font-bold mb-1.5"
          style={{ color: "var(--text-main)" }}
        >
          تأكيد كلمة المرور <span style={{ color: "var(--copper-500)" }}>*</span>
        </label>
        <input
          id="member-password-confirm"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          {...arabicValidity()}
          placeholder="••••••••"
          className="input"
        />
      </div>

      <ErrorNotice error={error}>
        {error === ALREADY_REGISTERED && (
          <>
            {" — "}
            <Link href={loginPathWithNext("/login")} className="underline font-bold">
              تسجيل الدخول
            </Link>
          </>
        )}
      </ErrorNotice>

      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={onBack}
          className="btn px-4"
          style={{ width: "auto", background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          <ArrowLabel direction="back">السابق</ArrowLabel>
        </button>
        <button
          type="button"
          onClick={onCreate}
          disabled={loading}
          className="btn btn-primary flex-1"
        >
          {loading ? "جاري إنشاء الحساب..." : <ArrowLabel>التالي</ArrowLabel>}
        </button>
      </div>
    </div>
  );
}
