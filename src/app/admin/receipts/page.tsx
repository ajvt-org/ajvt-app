"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import PageLoading from "@/components/PageLoading";
import IconLabel from "@/components/IconLabel";
import { saveReceiptPdf } from "@/components/pdf/receiptPdf";
import { receiptFileName, type OfficialReceiptView } from "@/lib/officialReceipt";
import { receiptAdmin } from "@/lib/texts/receipt";
import ReceiptForm from "./ReceiptForm";
import ReceiptList from "./ReceiptList";
import { useReceiptsData } from "./useReceiptsData";
import { emptyReceiptForm, type ReceiptForm as Form } from "./types";

export default function AdminReceiptsPage() {
  const { receipts, years, year, officersMissing, reload, showYear } = useReceiptsData();
  const [form, setForm] = useState<Form>(emptyReceiptForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState<OfficialReceiptView | null>(null);

  useEffect(() => {
    if (!printing) return;
    saveReceiptPdf(printing, receiptFileName(printing.number, "pdf"))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setPrinting(null));
  }, [printing]);

  async function issue() {
    setSaving(true);
    setError("");
    try {
      const { receipt } = await api.post<{ receipt: OfficialReceiptView }>("/api/admin/receipts", {
        payerName: form.payerName,
        reason: form.reason,
        amount: Number(form.amount),
        issuedOn: new Date(form.issuedOn).toISOString(),
      });
      setForm(emptyReceiptForm());
      await reload();
      setPrinting(receipt);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function cancel(receipt: OfficialReceiptView) {
    const reason = window.prompt(receiptAdmin.voidReasonLabel);
    if (!reason?.trim()) return;
    try {
      await api.post(`/api/admin/receipts/${receipt.number}/void`, { reason });
    } catch (err) {
      setError(errorMessage(err));
    }
    await reload();
  }

  if (!receipts) return <PageLoading />;

  return (
    <div className="p-4 flex flex-col gap-4">
      <h1 className="font-black text-lg" style={{ color: "var(--text-main)" }}>
        <IconLabel name="receipt">{receiptAdmin.title}</IconLabel>
      </h1>

      <ReceiptForm
        form={form}
        onChange={setForm}
        onSubmit={issue}
        saving={saving || !!printing}
        error={error}
        officersMissing={officersMissing}
      />

      {years.length > 1 && (
        <div className="flex items-center gap-2">
          <label htmlFor="receipt-year" className="text-sm font-bold">
            {receiptAdmin.yearLabel}
          </label>
          <select
            id="receipt-year"
            value={year ?? ""}
            onChange={(e) => showYear(Number(e.target.value))}
            className="input w-auto"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}

      <ReceiptList
        receipts={receipts}
        busyId={printing?.number ?? null}
        onPrint={setPrinting}
        onVoid={cancel}
      />
    </div>
  );
}
