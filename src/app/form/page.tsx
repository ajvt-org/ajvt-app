"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageLoading from "@/components/PageLoading";

function FormRedirect() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const query = params.toString();
    router.replace(query ? `/membership?${query}` : "/membership");
  }, [router, params]);

  return <PageLoading />;
}

export default function FormPage() {
  return (
    <div className="app-shell flex">
      <Suspense fallback={<PageLoading />}>
        <FormRedirect />
      </Suspense>
    </div>
  );
}
