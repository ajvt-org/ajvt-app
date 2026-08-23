"use client";

import IconLabel from "@/components/IconLabel";
import TempPasswordBox from "./TempPasswordBox";

function AttachAccount({
  phone,
  loading,
  error,
  onPhone,
  onAttach,
}: {
  phone: string;
  loading: boolean;
  error: string;
  onPhone: (phone: string) => void;
  onAttach: () => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
        <IconLabel name="ban">لا يوجد حساب مرتبط — رقم الهاتف غير معروف</IconLabel>
      </p>
      <div className="flex items-center gap-2">
        <input
          type="tel"
          dir="ltr"
          value={phone}
          onChange={(e) => onPhone(e.target.value.replace(/\D/g, "").slice(0, 8))}
          placeholder="2XXXXXXX"
          maxLength={8}
          className="input text-sm"
        />
        <button
          onClick={onAttach}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
          style={{ background: "var(--mint-600)", color: "white" }}
        >
          {loading ? "..." : "إنشاء حساب"}
        </button>
      </div>
      {error && (
        <p className="text-xs mt-1.5" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
    </div>
  );
}

export default function MemberAccountCard({
  hasAccount,
  resetLoading,
  tempPassword,
  tempPasswordHours,
  phone,
  attachLoading,
  attachError,
  onReset,
  onPhone,
  onAttach,
}: {
  hasAccount: boolean;
  resetLoading: boolean;
  tempPassword: string | null;
  tempPasswordHours: number;
  phone: string;
  attachLoading: boolean;
  attachError: string;
  onReset: () => void;
  onPhone: (phone: string) => void;
  onAttach: () => void;
}) {
  return (
    <div className="card p-4">
      {hasAccount ? (
        <div className="flex items-center justify-between gap-3">
          <span
            className="text-sm font-semibold flex items-center"
            style={{ color: "var(--text-muted)" }}
          >
            <IconLabel name="lock">كلمة مرور الحساب</IconLabel>
          </span>
          <button
            onClick={onReset}
            disabled={resetLoading}
            className="text-xs px-3 py-1.5 rounded-lg font-bold"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            {resetLoading ? "..." : "إعادة تعيين"}
          </button>
        </div>
      ) : (
        <AttachAccount
          phone={phone}
          loading={attachLoading}
          error={attachError}
          onPhone={onPhone}
          onAttach={onAttach}
        />
      )}
      {tempPassword && <TempPasswordBox value={tempPassword} hours={tempPasswordHours} />}
    </div>
  );
}
