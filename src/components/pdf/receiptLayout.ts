import { RECEIPT_WIDTH, SHEET_PADDING } from "@/components/receipt/receiptStyle";

export const PAGE_WIDTH = RECEIPT_WIDTH + SHEET_PADDING * 2;
export const INNER_PADDING = 24;
export const LEFT = SHEET_PADDING + INNER_PADDING;
export const RIGHT = PAGE_WIDTH - SHEET_PADDING - INNER_PADDING;
export const CONTENT = RIGHT - LEFT;
export const TOP = SHEET_PADDING + 22;

export const LINE_HEIGHT = 1.35;
export const ORG_SIZE = 16;
export const SECRETARIAT_SIZE = 11;
export const KIND_SIZE = 15;
export const ROW_SIZE = 13;
export const ROW_GAP = 9;
export const SMALL_SIZE = 11;
export const NUMBER_SIZE = 9;
export const LOGO = 52;
export const SEAL = 64;
export const QR = 54;
export const FOOTER_GAP = 10;
export const FOOTER_TOP = 18;
export const OFFICER = (CONTENT - SEAL - QR - FOOTER_GAP * 3) / 2;

const HEADING_HEIGHT =
  ORG_SIZE * LINE_HEIGHT + SECRETARIAT_SIZE * LINE_HEIGHT + 4 + KIND_SIZE * LINE_HEIGHT;
const HEADER_HEIGHT = Math.max(HEADING_HEIGHT, LOGO) + 2;
const RULE_HEIGHT = 1.5 + 6;
export const ROW_HEIGHT = ROW_SIZE + 3 + ROW_GAP;
export const ROWS = 5;
const OFFICER_HEIGHT = SMALL_SIZE * LINE_HEIGHT + 4 + 4 + SMALL_SIZE * LINE_HEIGHT;
const NUMBER_HEIGHT = QR + 2 + NUMBER_SIZE * LINE_HEIGHT;
export const FOOTER_HEIGHT = Math.max(OFFICER_HEIGHT, SEAL, NUMBER_HEIGHT);

export const ROWS_TOP = TOP + HEADER_HEIGHT + RULE_HEIGHT;
export const FOOTER_START = ROWS_TOP + ROW_HEIGHT * ROWS + FOOTER_TOP;
export const PAGE_HEIGHT = FOOTER_START + FOOTER_HEIGHT + SHEET_PADDING + 22;
