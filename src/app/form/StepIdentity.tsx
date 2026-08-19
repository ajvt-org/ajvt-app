"use client";

import type { Dispatch, SetStateAction } from "react";
import ArrowLabel from "@/components/ArrowLabel";
import IconLabel from "@/components/IconLabel";
import { arabicValidity } from "@/lib/validationMessage";
import ErrorNotice from "./ErrorNotice";
import PhoneInput from "./PhoneInput";
import { isArabicName, type FormValues } from "./constants";

export default function StepIdentity({
  form,
  setForm,
  authenticated,
  ages,
  showAddAge,
  newAge,
  setNewAge,
  onAgeSelect,
  onAddCustomAge,
  error,
  onNext,
}: {
  form: FormValues;
  setForm: Dispatch<SetStateAction<FormValues>>;
  authenticated: boolean;
  ages: string[];
  showAddAge: boolean;
  newAge: string;
  setNewAge: (value: string) => void;
  onAgeSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onAddCustomAge: () => void;
  error: string;
  onNext: () => void;
}) {
  return (
    <div className="space-y-5 fade-up delay-1">
      <div>
        <label
          htmlFor="member-fullname"
          className="block text-sm font-bold mb-1.5"
          style={{ color: "var(--text-main)" }}
        >
          الاسم الكامل (بالحروف العربية) <span style={{ color: "var(--copper-500)" }}>*</span>
        </label>
        <input
          id="member-fullname"
          name="fullName"
          value={form.fullName}
          onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
          required
          {...arabicValidity()}
          maxLength={30}
          placeholder="أدخل اسمك الكامل بالعربية"
          className="input"
        />
        {form.fullName && !isArabicName(form.fullName) && (
          <p className="text-xs mt-1" style={{ color: "#dc2626" }}>
            يرجى الكتابة بالحروف العربية فقط
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="member-phone"
          className="block text-sm font-bold mb-1.5"
          style={{ color: "var(--text-main)" }}
        >
          رقم الهاتف <span style={{ color: "var(--copper-500)" }}>*</span>
        </label>
        {authenticated ? (
          <>
            <p className="input flex items-center" dir="ltr" id="member-phone">
              {form.phone}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              رقم حسابك — لتغييره تواصل مع المشرف
            </p>
          </>
        ) : (
          <>
            <PhoneInput
              id="member-phone"
              value={form.phone}
              onChange={(val) => setForm((p) => ({ ...p, phone: val }))}
            />
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              8 أرقام — يبدأ بـ 2 أو 3 أو 4
            </p>
          </>
        )}
      </div>

      <div>
        <label
          htmlFor="member-age"
          className="block text-sm font-bold mb-1.5"
          style={{ color: "var(--text-main)" }}
        >
          العصر <span style={{ color: "var(--copper-500)" }}>*</span>
        </label>
        <select
          id="member-age"
          value={showAddAge ? "__add__" : form.age}
          onChange={onAgeSelect}
          className="input"
          style={{
            appearance: "none",
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%234a9c7e' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "left 12px center",
            paddingLeft: "36px",
          }}
        >
          <option value="" disabled>
            اختر العصر...
          </option>
          {ages.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
          <option value="__add__">+ إضافة عصر جديد</option>
        </select>

        {showAddAge && (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={newAge}
              onChange={(e) => setNewAge(e.target.value)}
              placeholder="اكتب اسم العصر..."
              maxLength={30}
              className="input flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddCustomAge();
                }
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={onAddCustomAge}
              disabled={!newAge.trim()}
              className="btn btn-primary px-4 py-2 text-sm font-bold disabled:opacity-40"
              style={{ width: "auto" }}
            >
              إضافة
            </button>
          </div>
        )}

        {form.age && !showAddAge && (
          <p className="text-xs mt-1 font-semibold" style={{ color: "var(--mint-600)" }}>
            <IconLabel name="check">{form.age}</IconLabel>
          </p>
        )}
      </div>

      <ErrorNotice error={error} />

      <button type="button" onClick={onNext} className="btn btn-primary mt-2">
        <ArrowLabel>التالي</ArrowLabel>
      </button>
    </div>
  );
}
