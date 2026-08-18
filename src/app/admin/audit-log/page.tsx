"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageLoading from "@/components/PageLoading";
import AdminToolHeader from "@/components/admin/AdminToolHeader";
import Pagination from "@/components/admin/Pagination";
import AuditLogEntryCard from "@/components/admin/AuditLogEntryCard";
import { counted } from "@/lib/arabicCount";
import { RESULT } from "@/lib/messages";
import {
  pageCount,
  readAuditFilters,
  readPage,
  writeAuditFilters,
  type AuditFilters,
} from "@/lib/auditFilters";
import AuditFilterRow from "./AuditFilterRow";
import { useAuditLog } from "./useAuditLog";

function AuditLogInner() {
  const router = useRouter();
  const params = useSearchParams();
  const query = new URLSearchParams(params.toString());
  const [filters, setFiltersState] = useState<AuditFilters>(readAuditFilters(query));
  const [page, setPageState] = useState(readPage(query));
  const { logs, total, admins, actions, targets, pageSize, loading } = useAuditLog(filters, page);

  function go(next: AuditFilters, nextPage: number) {
    setFiltersState(next);
    setPageState(nextPage);
    router.replace(`/admin/audit-log?${writeAuditFilters(next, nextPage)}`, { scroll: false });
  }

  return (
    <div className="admin-page">
      <div className="mb-3">
        <AdminToolHeader icon="list" title="سجل الإجراءات" note={counted(total, RESULT)} />
      </div>

      <AuditFilterRow
        filters={filters}
        admins={admins}
        actions={actions}
        targets={targets}
        onChange={(next) => go(next, 1)}
      />

      {loading ? (
        <PageLoading />
      ) : logs.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
          لا يوجد سجل مطابق
        </p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <AuditLogEntryCard key={log.id} log={log} />
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={pageCount(total, pageSize)}
        onGo={(next) => go(filters, next)}
      />
    </div>
  );
}

export default function AdminAuditLogPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuditLogInner />
    </Suspense>
  );
}
