"use client";

import type { jsPDF } from "jspdf";
import { RECEIPT_FONT } from "./receiptFonts";
import { textRuns } from "./textRuns";

export type Weight = "normal" | "bold";

export function setStyle(pdf: jsPDF, size: number, color: string, weight: Weight = "normal") {
  pdf.setFont(RECEIPT_FONT, weight);
  pdf.setFontSize(size);
  pdf.setTextColor(color);
}

function shaped(pdf: jsPDF, run: { rtl: boolean; text: string }): string {
  return run.rtl ? pdf.processArabic(run.text) : run.text;
}

export function measure(pdf: jsPDF, text: string): number {
  return textRuns(text).reduce((total, run) => total + pdf.getTextWidth(shaped(pdf, run)), 0);
}

export function drawFromRight(pdf: jsPDF, text: string, right: number, baseline: number): number {
  let cursor = right;
  for (const run of textRuns(text)) {
    const piece = shaped(pdf, run);
    const width = pdf.getTextWidth(piece);
    pdf.text(piece, cursor - width, baseline);
    cursor -= width;
  }
  return right - cursor;
}

export function drawCentred(pdf: jsPDF, text: string, centre: number, baseline: number): number {
  return drawFromRight(pdf, text, centre + measure(pdf, text) / 2, baseline);
}
