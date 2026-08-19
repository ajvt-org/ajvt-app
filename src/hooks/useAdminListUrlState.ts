"use client";

// The address holds the filters and the page; state mirrors it so typing stays
// local. Our own writes come back through searchParams, so they are queued and
// skipped on the way in, leaving only changes from elsewhere to adopt: a tab
// click onto the page already shown, a redirect, Back. Whatever lands last is
// what state ends up on, so the two never disagree.

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { readPage } from "@/lib/listUrlState";

export interface AdminListUrlAdapter<F> {
  keys: string[];
  readFilters: (params: URLSearchParams) => F;
  writeFilters: (filters: F) => URLSearchParams;
}

export function useAdminListUrlState<F>(basePath: string, adapter: AdminListUrlAdapter<F>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  function read(raw: string) {
    const params = new URLSearchParams(raw);
    return { filters: adapter.readFilters(params), page: readPage(params) };
  }

  const [state, setState] = useState(() => read(query));
  const [seen, setSeen] = useState(query);
  const [written, setWritten] = useState<string[]>([]);

  if (query !== seen) {
    setSeen(query);
    const index = written.indexOf(query);
    if (index === -1) {
      setState(read(query));
      setWritten([]);
    } else {
      setWritten(written.slice(index + 1));
    }
  }

  function go(nextFilters: F, nextPage = 1) {
    setState({ filters: nextFilters, page: nextPage });

    const params = new URLSearchParams(query);
    for (const key of adapter.keys) params.delete(key);
    params.delete("page");
    for (const [key, value] of adapter.writeFilters(nextFilters)) params.set(key, value);
    if (nextPage > 1) params.set("page", String(nextPage));

    const next = params.toString();
    setWritten((pending) => [...pending, next]);
    router.replace(next ? `${basePath}?${next}` : basePath, { scroll: false });
  }

  function goToPage(nextPage: number) {
    go(state.filters, nextPage);
  }

  return { filters: state.filters, page: state.page, go, goToPage };
}
