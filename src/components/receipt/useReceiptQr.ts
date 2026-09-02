"use client";

import { useEffect, useState } from "react";
import { verifyPath } from "@/lib/officialReceipt";
import { RECEIPT_INK, RECEIPT_PAPER } from "./receiptStyle";

export function useReceiptQr(token: string | undefined): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!token) return;
    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(`${window.location.origin}${verifyPath(token)}`, {
          width: 220,
          margin: 0,
          color: { dark: RECEIPT_INK, light: RECEIPT_PAPER },
        }),
      )
      .then((url) => {
        if (alive) setDataUrl(url);
      })
      .catch(() => {
        if (alive) setDataUrl(null);
      });
    return () => {
      alive = false;
    };
  }, [token]);

  return dataUrl;
}
