"use client";

import type { jsPDF } from "jspdf";
import { amountInWords } from "@/lib/arabicAmount";
import { moneyDigits } from "@/lib/money";
import { receiptDate, verifyPath, type OfficialReceiptView } from "@/lib/officialReceipt";
import { receiptSheet } from "@/lib/texts/receipt";
import {
  RECEIPT_BRONZE,
  RECEIPT_DOTS,
  RECEIPT_INK,
  RECEIPT_LOGO,
  RECEIPT_MUTED,
  RECEIPT_RULE,
  RECEIPT_SEAL,
} from "@/components/receipt/receiptStyle";
import { embedReceiptFont } from "./receiptFonts";
import { drawCentred, drawFromRight, measure, setStyle, type Weight } from "./pdfText";
import { drawQr } from "./receiptQr";
import { drawSvg } from "./receiptArt";
import {
  CONTENT,
  FOOTER_GAP,
  FOOTER_START,
  KIND_SIZE,
  LEFT,
  LINE_HEIGHT,
  LOGO,
  NUMBER_SIZE,
  OFFICER,
  ORG_SIZE,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  QR,
  RIGHT,
  ROWS_TOP,
  ROW_HEIGHT,
  ROW_SIZE,
  SEAL,
  SECRETARIAT_SIZE,
  SMALL_SIZE,
  TOP,
} from "./receiptLayout";

const MIN_SIZE = 8;

function heading(
  pdf: jsPDF,
  text: string,
  size: number,
  color: string,
  weight: Weight,
  top: number,
) {
  setStyle(pdf, size, color, weight);
  drawFromRight(pdf, text, RIGHT, top + size);
  return top + size * LINE_HEIGHT;
}

function dotted(pdf: jsPDF, from: number, to: number, at: number, weight: number) {
  pdf.setDrawColor(RECEIPT_DOTS);
  pdf.setLineWidth(weight);
  pdf.setLineDashPattern([1, 2], 0);
  pdf.line(from, at, to, at);
  pdf.setLineDashPattern([], 0);
}

function fit(pdf: jsPDF, text: string, room: number, size: number) {
  let tried = size;
  while (tried > MIN_SIZE && measure(pdf, text) > room) {
    tried -= 0.5;
    pdf.setFontSize(tried);
  }
  return tried;
}

const LABEL_GAP = 4;

function row(pdf: jsPDF, label: string, value: string, trailing: string | null, top: number) {
  const baseline = top + ROW_SIZE;
  setStyle(pdf, ROW_SIZE, RECEIPT_MUTED);
  const labelWidth = drawFromRight(pdf, label, RIGHT, baseline);
  const colonAt = RIGHT - labelWidth - LABEL_GAP;
  const colonWidth = drawFromRight(pdf, ":", colonAt, baseline);
  const valueAt = colonAt - colonWidth - LABEL_GAP;

  let taken = 0;
  if (trailing) {
    setStyle(pdf, SMALL_SIZE, RECEIPT_MUTED);
    taken = drawFromRight(pdf, trailing, LEFT + measure(pdf, trailing), baseline) + 10;
  }

  setStyle(pdf, ROW_SIZE, RECEIPT_INK, "bold");
  fit(pdf, value, valueAt - LEFT - taken, ROW_SIZE);
  drawFromRight(pdf, value, valueAt, baseline);

  dotted(pdf, LEFT, RIGHT, baseline + 3, 1);
  return top + ROW_HEIGHT;
}

function officer(pdf: jsPDF, role: string, name: string | null, centre: number, top: number) {
  setStyle(pdf, SMALL_SIZE, RECEIPT_INK, "bold");
  drawCentred(pdf, role, centre, top + SMALL_SIZE);
  const rule = top + SMALL_SIZE * LINE_HEIGHT + 4;
  dotted(pdf, centre - OFFICER / 2, centre + OFFICER / 2, rule, 1.5);
  if (!name) return;
  setStyle(pdf, SMALL_SIZE, RECEIPT_MUTED);
  fit(pdf, name, OFFICER, SMALL_SIZE);
  drawCentred(pdf, name, centre, rule + 4 + SMALL_SIZE);
}

function voidMark(pdf: jsPDF, GState: typeof import("jspdf").GState) {
  const size = 34;
  setStyle(pdf, size, RECEIPT_BRONZE, "bold");
  const shaped = pdf.processArabic(receiptSheet.voided);
  const width = pdf.getTextWidth(shaped);
  const radians = (18 * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const centre = { x: PAGE_WIDTH / 2, y: PAGE_HEIGHT / 2 };
  const half = { x: width / 2 + 26, y: size * 0.66 };
  const corners = (
    [
      [-half.x, -half.y],
      [half.x, -half.y],
      [half.x, half.y],
      [-half.x, half.y],
    ] as [number, number][]
  ).map(([x, y]) => [centre.x + x * cos + y * sin, centre.y - x * sin + y * cos]);

  pdf.saveGraphicsState();
  pdf.setGState(new GState({ opacity: 0.55 }));
  pdf.setDrawColor(RECEIPT_BRONZE);
  pdf.setLineWidth(3);
  corners.forEach(([x, y], at) => {
    const [nextX, nextY] = corners[(at + 1) % corners.length];
    pdf.line(x, y, nextX, nextY);
  });
  pdf.text(shaped, centre.x - (width / 2) * cos, centre.y + (width / 2) * sin + size * 0.34, {
    angle: 18,
  });
  pdf.restoreGraphicsState();
}

async function footer(pdf: jsPDF, receipt: OfficialReceiptView, origin: string) {
  const top = FOOTER_START;
  const sealLeft = RIGHT - OFFICER - FOOTER_GAP - SEAL;

  officer(pdf, receiptSheet.secretary, receipt.secretary, RIGHT - OFFICER / 2, top);
  officer(pdf, receiptSheet.treasurer, receipt.treasurer, sealLeft - FOOTER_GAP - OFFICER / 2, top);
  await drawSvg(pdf, RECEIPT_SEAL, sealLeft, top, SEAL);

  if (receipt.token) await drawQr(pdf, `${origin}${verifyPath(receipt.token)}`, LEFT, top, QR);
  setStyle(pdf, NUMBER_SIZE, RECEIPT_MUTED);
  drawCentred(pdf, receipt.number, LEFT + QR / 2, top + QR + 2 + NUMBER_SIZE);
}

export async function buildReceiptPdf(receipt: OfficialReceiptView, origin: string) {
  const { jsPDF: Doc, GState } = await import("jspdf");
  const pdf = new Doc({
    orientation: PAGE_HEIGHT >= PAGE_WIDTH ? "portrait" : "landscape",
    unit: "pt",
    format: [PAGE_WIDTH, PAGE_HEIGHT],
  });
  await embedReceiptFont(pdf);

  let y = heading(pdf, receiptSheet.org, ORG_SIZE, RECEIPT_INK, "bold", TOP);
  y = heading(pdf, receiptSheet.secretariat, SECRETARIAT_SIZE, RECEIPT_MUTED, "normal", y);
  heading(pdf, receiptSheet.kind, KIND_SIZE, RECEIPT_BRONZE, "bold", y + 4);
  await drawSvg(pdf, RECEIPT_LOGO, LEFT, TOP, LOGO);

  pdf.setFillColor(RECEIPT_RULE);
  pdf.rect(LEFT, ROWS_TOP - 7.5, CONTENT, 1.5, "F");

  let at = ROWS_TOP;
  at = row(pdf, receiptSheet.payer, receipt.payerName, null, at);
  at = row(pdf, receiptSheet.reason, receipt.reason, null, at);
  at = row(pdf, receiptSheet.inWords, amountInWords(receipt.amount), null, at);
  at = row(pdf, receiptSheet.inFigures, moneyDigits(receipt.amount), receiptSheet.currency, at);
  row(pdf, receiptSheet.date, receiptDate(receipt.issuedOn), null, at);

  await footer(pdf, receipt, origin);
  if (receipt.status === "VOID") voidMark(pdf, GState);
  return pdf;
}

export async function saveReceiptPdf(receipt: OfficialReceiptView, filename: string) {
  const pdf = await buildReceiptPdf(receipt, window.location.origin);
  pdf.save(filename);
}
