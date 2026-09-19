"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { writeAuditFilters, type AuditFilters } from "@/lib/auditFilters";
import { EMPTY_PAGE, type AuditLogPage } from "./auditLogTypes";
import { useFreshDataFromElsewhere } from "@/hooks/useFreshData";

function fetchPage(query: string): Promise<AuditLogPage> {
  return api.get<AuditLogPage>(`/api/admin/audit-log?${query}`).catch(() => EMPTY_PAGE);
}

export function useAuditLog(filters: AuditFilters, page: number) {
  const [state, setState] = useState({ data: EMPTY_PAGE, loading: true });
  const [asked, setAsked] = useState(0);
  const query = writeAuditFilters(filters, page).toString();

  useFreshDataFromElsewhere(useCallback(() => setAsked((n) => n + 1), []));

  useEffect(() => {
    let live = true;
    fetchPage(query).then((data) => live && setState({ data, loading: false }));
    return () => {
      live = false;
    };
  }, [query, asked]);

  return { ...state.data, loading: state.loading };
}
