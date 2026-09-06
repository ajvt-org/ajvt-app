"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import AdminToolHeader from "@/components/admin/AdminToolHeader";
import AccountRow from "@/components/admin/shell/AccountRow";
import ActivityPicker from "@/components/admin/shell/ActivityPicker";
import NewAccountForm from "@/components/admin/shell/NewAccountForm";
import { isFullAccount } from "@/components/admin/shell/accountTypes";
import type { AdminAccountRow } from "@/components/admin/shell/accountTypes";
import { adminAccounts } from "@/lib/texts";

function fetchAccounts(): Promise<AdminAccountRow[]> {
  return api
    .get<{ admins: AdminAccountRow[] }>("/api/admin/admins")
    .then((data) => data.admins || [])
    .catch(() => []);
}

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<AdminAccountRow[]>([]);
  const [viewer, setViewer] = useState<{ username: string; role: string } | null>(null);
  const [scoping, setScoping] = useState<string | null>(null);

  const load = () => fetchAccounts().then(setAccounts);

  useEffect(() => {
    fetchAccounts().then(setAccounts);
    api
      .get<{ username: string; role: string }>("/api/admin/me")
      .then(setViewer)
      .catch(() => setViewer(null));
  }, []);

  async function remove(id: string) {
    if (!confirm(adminAccounts.confirmDelete)) return;
    try {
      await api.del(`/api/admin/admins/${id}`);
      await load();
    } catch (e) {
      alert(errorMessage(e));
    }
  }

  async function setRole(id: string, role: string) {
    try {
      await api.patch(`/api/admin/admins/${id}`, { role });
    } catch (e) {
      throw new Error(errorMessage(e));
    }
    await load();
  }

  const picked = accounts.find((a) => a.id === scoping);

  if (picked && isFullAccount(picked)) {
    return (
      <div className="admin-page space-y-4">
        <ActivityPicker account={picked} onBack={() => setScoping(null)} onSaved={load} />
      </div>
    );
  }

  return (
    <div className="admin-page space-y-4">
      <AdminToolHeader href="/admin/admins" />

      <div className="space-y-2">
        {accounts.map((account) => (
          <AccountRow
            key={account.id}
            account={account}
            viewerRole={viewer?.role ?? null}
            isSelf={account.username === viewer?.username}
            onScope={() => setScoping(account.id)}
            onRole={(role) => setRole(account.id, role)}
            onDelete={() => remove(account.id)}
          />
        ))}
      </div>

      <NewAccountForm viewerRole={viewer?.role ?? null} onCreated={load} />
    </div>
  );
}
