"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageLoading from "@/components/PageLoading";
import AdminToolHeader from "@/components/admin/AdminToolHeader";
import Pagination from "@/components/admin/Pagination";
import AuditLogEntryCard from "@/components/admin/AuditLogEntryCard";
import { AUDIT_LOGIN_DAYS, AUDIT_LOG_DAYS } from "@/lib/auditRetention";
import { auditLogPage } from "@/lib/texts";
import { DAY, RESULT } from "@/lib/messages";
import {
  pageCount,
  readAuditFilters,
  readPage,
  writeAuditFilters,
  type AuditFilters,
} from "@/lib/auditFilters";
import IconLabel from "@/components/IconLabel";
import AuditFilterRow from "./AuditFilterRow";
import { useAuditLog } from "./useAuditLog";
import { counted } from "@/lib/arabicCount";

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
      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <AdminToolHeader href="/admin/audit-log" note={counted(total, RESULT)} />
        <a
          href={`/api/admin/export/audit?${writeAuditFilters(filters)}`}
          className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
          style={{
            background: "var(--mint-100)",
            color: "var(--mint-700)",
            border: "1px solid var(--mint-200)",
          }}
        >
          <IconLabel name="download">{auditLogPage.exportCsv}</IconLabel>
        </a>
      </div>

      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
        {auditLogPage.kept(counted(AUDIT_LOG_DAYS, DAY), counted(AUDIT_LOGIN_DAYS, DAY))}
      </p>

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
          {auditLogPage.noMatch}
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
