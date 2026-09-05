"use client";

import type { jsPDF } from "jspdf";

export const RECEIPT_FONT = "Amiri";

const FILES: Record<string, string> = {
  normal: "amiri-regular.ttf",
  bold: "amiri-bold.ttf",
};

export async function embedReceiptFont(pdf: jsPDF): Promise<void> {
  for (const [style, file] of Object.entries(FILES)) {
    pdf.addFileToVFS(file, await (await fetch(`/fonts/${file}.base64`)).text());
    pdf.addFont(file, RECEIPT_FONT, style);
  }
}
