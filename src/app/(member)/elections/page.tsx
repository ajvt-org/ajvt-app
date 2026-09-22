"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import PageLoading from "@/components/PageLoading";
import { electionMember as texts } from "@/lib/texts";
import { parentFrom } from "@/lib/backLink";
import ElectionsList from "./ElectionsList";
import type { MemberElection } from "./electionTypes";

export default function ElectionsPage() {
  return (
    <Suspense fallback={null}>
      <ElectionsScreen />
    </Suspense>
  );
}

function ElectionsScreen() {
  const from = useSearchParams().get("from");
  const [elections, setElections] = useState<MemberElection[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/elections");
      const json = res.ok ? await res.json() : null;
      setElections(json?.elections ?? []);
      setSignedIn(!!json?.signedIn);
    } catch {
      setElections([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => setLoading(false));
  }, [load]);

  if (loading) {
    return (
      <div className="app-shell">
        <PageHeader title={texts.listTitle} />
        <PageLoading />
      </div>
    );
  }

  return (
    <ElectionsList
      elections={elections}
      backHref={parentFrom(from, signedIn ? "/home" : "/", signedIn)}
      onReached={load}
    />
  );
}
