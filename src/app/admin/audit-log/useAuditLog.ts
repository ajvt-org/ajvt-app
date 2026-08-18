"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { writeAuditFilters, type AuditFilters } from "@/lib/auditFilters";
import { EMPTY_PAGE, type AuditLogPage } from "./auditLogTypes";

function fetchPage(query: string): Promise<AuditLogPage> {
  return api.get<AuditLogPage>(`/api/admin/audit-log?${query}`).catch(() => EMPTY_PAGE);
}

export function useAuditLog(filters: AuditFilters, page: number) {
  const [state, setState] = useState({ data: EMPTY_PAGE, loading: true });
  const query = writeAuditFilters(filters, page).toString();

  useEffect(() => {
    let live = true;
    fetchPage(query).then((data) => live && setState({ data, loading: false }));
    return () => {
      live = false;
    };
  }, [query]);

  return { ...state.data, loading: state.loading };
}
