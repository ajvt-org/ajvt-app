"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import PageLoading from "@/components/PageLoading";
import TreasuryView from "./TreasuryView";
import type { Treasury } from "@/lib/treasury";

export default function TreasuryPage() {
  const [treasury, setTreasury] = useState<Treasury | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<Treasury>("/api/admin/finance/treasury")
      .then(setTreasury)
      .catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) {
    return (
      <div className="p-4">
        <div
          className="card p-4 text-sm font-semibold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          <IconLabel name="warning">{error}</IconLabel>
        </div>
      </div>
    );
  }

  if (!treasury) return <PageLoading />;

  return <TreasuryView treasury={treasury} />;
}
