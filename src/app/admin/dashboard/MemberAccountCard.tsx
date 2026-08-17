"use client";

import IconLabel from "@/components/IconLabel";
import { hoursLabel } from "@/lib/arabicPlural";

function TempPassword({ value, hours }: { value: string; hours: number }) {
  return (
    <div
      className="mt-3 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2"
      style={{ background: "var(--mint-50)", border: "1px solid var(--mint-200)" }}
    >
      <div>
        <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>
          كلمة المرور المؤقتة — سلّمها للعضو
        </p>
        <p className="font-mono font-black text-lg" style={{ color: "var(--mint-700)" }} dir="ltr">
          {value}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          صالحة {hoursLabel(hours)}، وسيُطلب منه تغييرها عند الدخول
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(value)}
        className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
        style={{ background: "var(--mint-600)", color: "white" }}
      >
        نسخ
      </button>
    </div>
  );
}

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
        📵 لا يوجد حساب مرتبط — رقم الهاتف غير معروف
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
          <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
            <IconLabel name="key">كلمة مرور الحساب</IconLabel>
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
      {tempPassword && <TempPassword value={tempPassword} hours={tempPasswordHours} />}
    </div>
  );
}
