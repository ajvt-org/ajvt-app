"use client";

import { useState } from "react";
import { MEMBERSHIP_FEE, PAYMENT_METHODS } from "@/lib/donations";
import { api, errorMessage } from "@/lib/api";
import { uploadFile } from "@/lib/upload";
import { emptyManualForm } from "./constants";
import type { AgeGroup } from "./types";
import DialogClose from "@/components/DialogClose";
import IconLabel from "@/components/IconLabel";

type Props = {
  ageGroups: AgeGroup[];
  onCreated: () => Promise<void> | void;
  onManageAgeGroups: () => void;
  onClose: () => void;
};

export default function ManualAddDialog({
  ageGroups,
  onCreated,
  onManageAgeGroups,
  onClose,
}: Props) {
  const [form, setForm] = useState(emptyManualForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ tempPassword?: string } | null>(null);
  const [proof, setProof] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  async function handleProofChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofPreview(URL.createObjectURL(file));
    setProofUploading(true);
    try {
      setProof(await uploadFile(file));
    } catch (err) {
      setError(errorMessage(err));
      setProofPreview(null);
    } finally {
      setProofUploading(false);
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUploading(true);
    try {
      setPhoto(await uploadFile(file));
    } catch (err) {
      setError(errorMessage(err));
      setPhotoPreview(null);
    } finally {
      setPhotoUploading(false);
    }
  }

  async function createMember(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await api.post<{ tempPassword?: string }>("/api/admin/members", {
        ...form,
        paymentProof: proof,
        photo,
      });
      setResult({ tempPassword: data.tempPassword });
      setForm(emptyManualForm);
      setProof(null);
      setProofPreview(null);
      setPhoto(null);
      setPhotoPreview(null);
      await onCreated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-t-3xl md:rounded-2xl overflow-y-auto"
        style={{ background: "var(--mint-50)", maxHeight: "92svh", direction: "rtl" }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between sticky top-0"
          style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
        >
          <h2 className="font-black text-white text-base">
            <IconLabel name="plus">إضافة عضو يدوياً</IconLabel>
          </h2>
          <DialogClose onClick={onClose} />
        </div>

        <div className="p-5 space-y-3">
          {result ? (
            <div className="space-y-3">
              <div
                className="p-3 rounded-xl text-sm font-semibold"
                style={{ background: "#d1fae5", color: "#065f46" }}
              >
                ✅ تم إنشاء العضو بنجاح
              </div>
              {result.tempPassword && (
                <div
                  className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-2"
                  style={{ background: "white", border: "1px solid var(--mint-200)" }}
                >
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>
                      كلمة مرور الحساب الجديد — سلّمها للعضو
                    </p>
                    <p
                      className="font-mono font-black text-lg"
                      style={{ color: "var(--mint-700)" }}
                      dir="ltr"
                    >
                      {result.tempPassword}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(result.tempPassword!)}
                    className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
                    style={{ background: "var(--mint-600)", color: "white" }}
                  >
                    نسخ
                  </button>
                </div>
              )}
              <button onClick={() => setResult(null)} className="btn btn-primary text-sm">
                إضافة عضو آخر
              </button>
            </div>
          ) : (
            <form onSubmit={createMember} className="space-y-3">
              <div
                className="flex items-center gap-2 p-2.5 rounded-lg"
                style={{ background: "var(--mint-100)" }}
              >
                <input
                  type="checkbox"
                  id="phoneUnknown"
                  checked={form.phoneUnknown}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      phoneUnknown: e.target.checked,
                      accountPhone: "",
                      memberPhone: "",
                    }))
                  }
                  className="w-4 h-4"
                />
                <label
                  htmlFor="phoneUnknown"
                  className="text-sm font-bold"
                  style={{ color: "var(--mint-700)" }}
                >
                  📵 رقم الهاتف غير معروف — يُضاف لاحقاً
                </label>
              </div>
              {!form.phoneUnknown && (
                <div>
                  <label
                    className="block text-sm font-bold mb-1.5"
                    style={{ color: "var(--text-main)" }}
                    htmlFor="accountPhone"
                  >
                    رقم هاتف الحساب <span style={{ color: "var(--copper-500)" }}>*</span>
                  </label>
                  <input
                    id="accountPhone"
                    type="tel"
                    dir="ltr"
                    value={form.accountPhone}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        accountPhone: e.target.value.replace(/\D/g, "").slice(0, 8),
                      }))
                    }
                    placeholder="2XXXXXXX"
                    maxLength={8}
                    required
                    className="input"
                  />
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    إن لم يوجد حساب بهذا الرقم، سيُنشأ حساب جديد تلقائياً بكلمة مرور مؤقتة
                  </p>
                </div>
              )}
              <div>
                <label
                  className="block text-sm font-bold mb-1.5"
                  style={{ color: "var(--text-main)" }}
                  htmlFor="fullName"
                >
                  الاسم الكامل
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                  maxLength={30}
                  required
                  className="input"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-bold mb-1.5"
                  style={{ color: "var(--text-main)" }}
                >
                  صورة العضو (اختياري)
                </label>
                <label className="upload-zone" style={{ display: "block", cursor: "pointer" }}>
                  {photoPreview ? (
                    <div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoPreview}
                        alt="صورة العضو"
                        className="max-h-32 mx-auto rounded-xl object-contain"
                      />
                      <p className="mt-1 text-xs text-center" style={{ color: "var(--mint-600)" }}>
                        {photoUploading ? "جاري الرفع..." : "انقر لتغيير الصورة"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>
                      📷 انقر لإرفاق صورة العضو (اختياري)
                    </p>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
              {!form.phoneUnknown && (
                <div>
                  <label
                    className="block text-sm font-bold mb-1.5"
                    style={{ color: "var(--text-main)" }}
                    htmlFor="memberPhone"
                  >
                    رقم هاتف العضو
                  </label>
                  <input
                    id="memberPhone"
                    type="tel"
                    dir="ltr"
                    value={form.memberPhone}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        memberPhone: e.target.value.replace(/\D/g, "").slice(0, 8),
                      }))
                    }
                    maxLength={8}
                    required
                    className="input"
                  />
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    className="block text-sm font-bold"
                    style={{ color: "var(--text-main)" }}
                    htmlFor="age"
                  >
                    العصر
                  </label>
                  <button
                    type="button"
                    onClick={onManageAgeGroups}
                    className="text-xs font-bold"
                    style={{ color: "var(--mint-600)" }}
                  >
                    🏷️ إدارة الأعاصر
                  </button>
                </div>
                <select
                  id="age"
                  value={form.age}
                  onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))}
                  required
                  className="input"
                >
                  <option value="" disabled>
                    اختر العصر...
                  </option>
                  {ageGroups.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="block text-sm font-bold mb-1.5"
                  style={{ color: "var(--text-main)" }}
                  htmlFor="paymentMethod"
                >
                  طريقة الدفع
                </label>
                <select
                  id="paymentMethod"
                  value={form.paymentMethod}
                  onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))}
                  required
                  className="input"
                >
                  <option value="" disabled>
                    اختر...
                  </option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="block text-sm font-bold mb-1.5"
                  style={{ color: "var(--text-main)" }}
                  htmlFor="paidAmount"
                >
                  المبلغ المسدد (أوقية) — اختياري
                </label>
                <input
                  id="paidAmount"
                  type="number"
                  inputMode="numeric"
                  min={MEMBERSHIP_FEE}
                  value={form.paidAmount}
                  onChange={(e) => setForm((p) => ({ ...p, paidAmount: e.target.value }))}
                  placeholder={String(MEMBERSHIP_FEE)}
                  className="input"
                  dir="ltr"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-bold mb-1.5"
                  style={{ color: "var(--text-main)" }}
                  htmlFor="status"
                >
                  حالة العضوية
                </label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      status: e.target.value as "PENDING" | "ACTIVE",
                    }))
                  }
                  className="input"
                >
                  <option value="ACTIVE">مقبول مباشرة</option>
                  <option value="PENDING">قيد الانتظار</option>
                </select>
              </div>
              <div>
                <label
                  className="block text-sm font-bold mb-1.5"
                  style={{ color: "var(--text-main)" }}
                >
                  صورة إثبات الدفع (اختياري)
                </label>
                <label className="upload-zone" style={{ display: "block", cursor: "pointer" }}>
                  {proofPreview ? (
                    <div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proofPreview}
                        alt="إثبات الدفع"
                        className="max-h-32 mx-auto rounded-xl object-contain"
                      />
                      <p className="mt-1 text-xs text-center" style={{ color: "var(--mint-600)" }}>
                        {proofUploading ? "جاري الرفع..." : "انقر لتغيير الصورة"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>
                      📸 انقر لإرفاق صورة (اختياري)
                    </p>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProofChange}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              {error && (
                <div
                  className="p-3 rounded-xl text-sm font-semibold"
                  style={{ background: "#fee2e2", color: "#991b1b" }}
                >
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || proofUploading || photoUploading}
                className="btn btn-primary text-sm"
              >
                {proofUploading || photoUploading
                  ? "جاري رفع الصورة..."
                  : loading
                    ? "..."
                    : "إنشاء العضو"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
