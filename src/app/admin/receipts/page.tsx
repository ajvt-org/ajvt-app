"use client";

import { useEffect, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import PageLoading from "@/components/PageLoading";
import IconLabel from "@/components/IconLabel";
import ReceiptSheet from "@/components/receipt/ReceiptSheet";
import { useReceiptQr } from "@/components/receipt/useReceiptQr";
import { savePdf } from "@/components/pdf/renderPdf";
import { receiptFileName, type OfficialReceiptView } from "@/lib/officialReceipt";
import { receiptAdmin } from "@/lib/texts/receipt";
import ReceiptForm from "./ReceiptForm";
import ReceiptList from "./ReceiptList";
import { useReceiptsData } from "./useReceiptsData";
import { emptyReceiptForm, type ReceiptForm as Form } from "./types";

export default function AdminReceiptsPage() {
  const { receipts, officersMissing, reload } = useReceiptsData();
  const [form, setForm] = useState<Form>(emptyReceiptForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState<OfficialReceiptView | null>(null);

  const qrDataUrl = useReceiptQr(printing?.token ?? "");
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!printing || !qrDataUrl || !sheetRef.current) return;
    savePdf(sheetRef.current, receiptFileName(printing.number, "pdf"))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setPrinting(null));
  }, [printing, qrDataUrl]);

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

      <ReceiptList
        receipts={receipts}
        busyId={printing?.number ?? null}
        onPrint={setPrinting}
        onVoid={cancel}
      />

      {printing && (
        <div style={{ position: "fixed", left: -10000, top: 0 }} aria-hidden="true">
          <ReceiptSheet receipt={printing} qrDataUrl={qrDataUrl} innerRef={sheetRef} />
        </div>
      )}
    </div>
  );
}
