"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { readPage } from "@/lib/listUrlState";

export interface AdminListUrlAdapter<F> {
  readFilters: (params: URLSearchParams) => F;
  writeFilters: (filters: F) => URLSearchParams;
}

export function useAdminListUrlState<F>(basePath: string, adapter: AdminListUrlAdapter<F>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = new URLSearchParams(searchParams.toString());
  const [filters, setFiltersState] = useState<F>(() => adapter.readFilters(initial));
  const [page, setPageState] = useState<number>(() => readPage(initial));

  function go(nextFilters: F, nextPage = 1) {
    setFiltersState(nextFilters);
    setPageState(nextPage);
    const params = adapter.writeFilters(nextFilters);
    if (nextPage > 1) params.set("page", String(nextPage));
    const query = params.toString();
    router.replace(query ? `${basePath}?${query}` : basePath, { scroll: false });
  }

  function goToPage(nextPage: number) {
    go(filters, nextPage);
  }

  return { filters, page, go, goToPage };
}
