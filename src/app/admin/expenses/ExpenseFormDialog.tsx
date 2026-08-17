"use client";

import DialogClose from "@/components/DialogClose";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PhotoUpload from "@/components/PhotoUpload";
import FinanceTagChips from "@/components/admin/FinanceTagChips";
import type { FinanceTagRow } from "@/components/admin/FinanceTagManager";
import type { ActivityOption, ExpenseForm } from "./types";

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block text-sm font-bold mb-1.5"
        style={{ color: "var(--text-main)" }}
        htmlFor={id}
      >
        {label} {required && <span style={{ color: "var(--copper-500)" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export default function ExpenseFormDialog({
  form,
  tags,
  activities,
  editing,
  error,
  saving,
  onChange,
  onSubmit,
  onClose,
}: {
  form: ExpenseForm;
  tags: FinanceTagRow[];
  activities: ActivityOption[];
  editing: boolean;
  error: string;
  saving: boolean;
  onChange: (patch: Partial<ExpenseForm>) => void;
  onSubmit: (ev: React.SubmitEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
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
            {editing ? (
              <IconLabel name="pencil">تعديل مصروف</IconLabel>
            ) : (
              <IconLabel name="plus">إضافة مصروف</IconLabel>
            )}
          </h2>
          <DialogClose onClick={onClose} />
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-3">
          <div>
            <p className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
              صورة الفاتورة / الإيصال (اختياري)
            </p>
            <PhotoUpload
              photo={form.proof || null}
              imageUrlPrefix="/api/files"
              variant="cover"
              label="صورة الفاتورة"
              placeholderIcon="receipt"
              onUpload={(filename) => onChange({ proof: filename })}
            />
          </div>

          <Field id="expense-label" label="الوصف" required>
            <input
              id="expense-label"
              type="text"
              value={form.label}
              onChange={(e) => onChange({ label: e.target.value })}
              maxLength={100}
              required
              className="input"
            />
          </Field>

          <Field id="expense-amount" label="المبلغ (MRU)" required>
            <input
              id="expense-amount"
              type="number"
              dir="ltr"
              min={1}
              value={form.amount}
              onChange={(e) => onChange({ amount: e.target.value })}
              required
              className="input"
            />
          </Field>

          <Field id="expense-date" label="التاريخ">
            <input
              id="expense-date"
              type="date"
              dir="ltr"
              value={form.date}
              onChange={(e) => onChange({ date: e.target.value })}
              className="input"
            />
          </Field>

          <Field id="expense-note" label="ملاحظة (اختياري)">
            <input
              id="expense-note"
              type="text"
              value={form.note}
              onChange={(e) => onChange({ note: e.target.value })}
              maxLength={200}
              className="input"
            />
          </Field>

          <Field id="expense-activity" label="النشاط (اختياري)">
            <select
              id="expense-activity"
              value={form.activityId}
              onChange={(e) => onChange({ activityId: e.target.value })}
              className="input"
            >
              <option value="">بدون نشاط</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </Field>

          <div>
            <p className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
              التصنيفات
            </p>
            <FinanceTagChips
              tags={tags}
              selected={form.tagIds}
              onToggle={(id) =>
                onChange({
                  tagIds: form.tagIds.includes(id)
                    ? form.tagIds.filter((t) => t !== id)
                    : [...form.tagIds, id],
                })
              }
              empty="لا توجد تصنيفات بعد، أضفها من زر التصنيفات"
            />
          </div>

          {error && (
            <div
              className="p-3 rounded-xl text-sm font-semibold"
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              <Icon name="warning" size={13} className="icon-inline" /> {error}
            </div>
          )}

          <button type="submit" disabled={saving} className="btn btn-primary text-sm">
            {saving ? (
              "..."
            ) : editing ? (
              <IconLabel name="save">حفظ التعديل</IconLabel>
            ) : (
              "إضافة المصروف"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
