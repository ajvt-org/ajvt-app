"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { OfficialReceiptView } from "@/lib/officialReceipt";
import type { AppSettingsValues } from "@/lib/settings";

export function useReceiptsData() {
  const [receipts, setReceipts] = useState<OfficialReceiptView[] | null>(null);
  const [officersMissing, setOfficersMissing] = useState(false);

  function load() {
    return Promise.all([
      api.get<{ receipts: OfficialReceiptView[] }>("/api/admin/receipts").catch(() => null),
      api.get<{ settings: AppSettingsValues }>("/api/admin/settings").catch(() => null),
    ]).then(([list, settings]) => {
      setReceipts(list?.receipts ?? []);
      if (settings) {
        setOfficersMissing(!settings.settings.secretaryName || !settings.settings.treasurerName);
      }
    });
  }

  useEffect(() => {
    load();
  }, []);

  return { receipts, officersMissing, reload: load };
}
