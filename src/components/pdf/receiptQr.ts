"use client";

import type { jsPDF } from "jspdf";
import { RECEIPT_INK } from "@/components/receipt/receiptStyle";

export async function drawQr(pdf: jsPDF, url: string, left: number, top: number, size: number) {
  const { create } = await import("qrcode");
  const { modules } = create(url, { errorCorrectionLevel: "M" });
  const cell = size / modules.size;
  pdf.setFillColor(RECEIPT_INK);
  for (let row = 0; row < modules.size; row++) {
    let run = 0;
    for (let column = 0; column <= modules.size; column++) {
      const filled = column < modules.size && modules.get(row, column);
      if (filled) {
        run += 1;
        continue;
      }
      if (run > 0) {
        pdf.rect(left + (column - run) * cell, top + row * cell, run * cell, cell, "F");
        run = 0;
      }
    }
  }
}
