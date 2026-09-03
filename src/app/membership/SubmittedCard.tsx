"use client";

import ArrowLabel from "@/components/ArrowLabel";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import type { PaymentValues } from "./constants";
import Money from "@/components/Money";

export default function SubmittedCard({
  form,
  editing,
  copied,
  onCopy,
  onShare,
  onProfile,
}: {
  form: PaymentValues & { fullName: string };
  editing: boolean;
  copied: string | null;
  onCopy: (code: string) => void;
  onShare: () => void;
  onProfile: () => void;
}) {
  return (
    <div className="app-shell">
      <div
        className="px-5 py-8 text-center"
        style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
      >
        <div className="mb-2 flex justify-center">
          <Icon name="check" size={48} color="white" />
        </div>
        <h1 className="text-lg font-black text-white">
          {editing ? "تم إرسال التعديلات بنجاح" : "تم إرسال طلبك بنجاح"}
        </h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.8)" }}>
          سيراجع فريق الرابطة طلبك خلال أقل من ساعة
        </p>
      </div>

      <div className="px-5 py-6 space-y-4">
        <div className="card p-4 fade-up">
          <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
            رقم دفترك — احتفظ به للمتابعة
          </p>
          <div
            className="flex items-center justify-between rounded-xl px-3 py-2.5"
            style={{ background: "var(--mint-50)" }}
          >
            <span
              className="font-mono font-black text-lg"
              style={{ color: "var(--mint-700)" }}
              dir="ltr"
            >
              {form.referenceCode}
            </span>
            <button
              type="button"
              onClick={() => onCopy(form.referenceCode)}
              className="text-xs px-3 py-1.5 rounded-lg font-bold"
              style={{
                background: copied === form.referenceCode ? "var(--mint-600)" : "white",
                color: copied === form.referenceCode ? "white" : "var(--mint-700)",
                border: "1px solid var(--mint-200)",
              }}
            >
              {copied === form.referenceCode ? <IconLabel name="check">تم النسخ</IconLabel> : "نسخ"}
            </button>
          </div>
        </div>

        <div className="card p-4 fade-up delay-1">
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
            ملخص الطلب
          </p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span style={{ color: "var(--text-muted)" }}>الاسم</span>
              <span className="font-bold">{form.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--text-muted)" }}>طريقة الدفع</span>
              <span className="font-bold">{form.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--text-muted)" }}>المبلغ</span>
              <Money value={Number(form.paidAmount)} className="font-bold" />
            </div>
          </div>
        </div>

        <button type="button" onClick={onShare} className="btn btn-primary fade-up delay-1">
          <IconLabel name="upload">مشاركة رقم الدفتر</IconLabel>
        </button>
        <button
          type="button"
          onClick={onProfile}
          className="btn fade-up delay-2"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          <ArrowLabel>الذهاب إلى حسابي</ArrowLabel>
        </button>
      </div>
    </div>
  );
}
