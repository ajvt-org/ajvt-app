"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import PageLoading from "@/components/PageLoading";
import { electionMember as texts } from "@/lib/texts";
import { parentFrom, withFrom } from "@/lib/backLink";
import ElectionView from "../ElectionView";
import type { ElectionDetailPayload } from "../electionTypes";

export default function ElectionPage() {
  return (
    <Suspense fallback={null}>
      <ElectionScreen />
    </Suspense>
  );
}

function ElectionScreen() {
  const id = String(useParams().id ?? "");
  const from = useSearchParams().get("from");
  const [payload, setPayload] = useState<ElectionDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/elections/${id}`);
      setPayload(res.ok ? await res.json() : null);
    } catch {
      setPayload(null);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => setLoading(false));
  }, [load]);

  const backHref = parentFrom(from, "/elections", true);

  if (loading) {
    return (
      <div className="app-shell">
        <PageHeader title={texts.listTitle} backHref={backHref} />
        <PageLoading />
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="app-shell">
        <PageHeader title={texts.listTitle} backHref={backHref} />
        <div className="px-5 py-10">
          <div className="card p-8 text-center space-y-3">
            <div className="flex justify-center" style={{ color: "var(--mint-500)" }}>
              <Icon name="ballot" size={36} />
            </div>
            <p className="font-bold" style={{ color: "var(--text-main)" }}>
              {texts.notFound}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ElectionView
      payload={payload}
      backHref={backHref}
      membershipHref={withFrom("/membership", `/elections/${id}`)}
      onReached={load}
    />
  );
}
