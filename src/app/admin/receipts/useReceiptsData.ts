"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { OfficialReceiptView } from "@/lib/officialReceipt";
import type { AppSettingsValues } from "@/lib/settings";

type ListResponse = {
  receipts: OfficialReceiptView[];
  years: number[];
  year: number | null;
};

export function useReceiptsData() {
  const [receipts, setReceipts] = useState<OfficialReceiptView[] | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [officersMissing, setOfficersMissing] = useState(false);

  const load = useCallback((asked?: number | null) => {
    const query = asked ? `?year=${asked}` : "";
    return Promise.all([
      api.get<ListResponse>(`/api/admin/receipts${query}`).catch(() => null),
      api.get<{ settings: AppSettingsValues }>("/api/admin/settings").catch(() => null),
    ]).then(([list, settings]) => {
      setReceipts(list?.receipts ?? []);
      setYears(list?.years ?? []);
      setYear(list?.year ?? null);
      if (settings) {
        setOfficersMissing(!settings.settings.secretaryName || !settings.settings.treasurerName);
      }
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    receipts,
    years,
    year,
    officersMissing,
    reload: () => load(year),
    showYear: (next: number) => load(next),
  };
}
