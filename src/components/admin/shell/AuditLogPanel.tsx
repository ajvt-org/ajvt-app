"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import AuditLogDialog from "../AuditLogDialog";
import type { AuditLogEntry } from "../auditLogTypes";

export default function AuditLogPanel({
  onBack,
  onClose,
}: {
  onBack: () => void;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ logs: AuditLogEntry[] }>("/api/admin/audit-log")
      .then((data) => setLogs(data.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  return <AuditLogDialog logs={logs} loading={loading} onClose={onClose} onBack={onBack} />;
}
