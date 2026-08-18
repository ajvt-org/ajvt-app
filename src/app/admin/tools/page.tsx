"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import PageLoading from "@/components/PageLoading";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { toolsFor } from "./toolLinks";

export default function AdminToolsPage() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ role: string }>("/api/admin/me")
      .then((me) => setRole(me.role))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;

  return (
    <div className="admin-page space-y-3">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="shield">أدوات المشرف</IconLabel>
      </p>

      <div className="space-y-2">
        {toolsFor(role).map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="card p-4 gap-3 font-semibold text-sm"
            style={{
              color: "var(--text-main)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <IconLabel name={tool.icon}>{tool.label}</IconLabel>
            <Icon name="chevronLeft" size={14} />
          </Link>
        ))}
      </div>
    </div>
  );
}
