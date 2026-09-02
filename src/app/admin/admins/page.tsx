"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import AdminToolHeader from "@/components/admin/AdminToolHeader";
import AccountRow from "@/components/admin/shell/AccountRow";
import ActivityPicker from "@/components/admin/shell/ActivityPicker";
import NewAccountForm from "@/components/admin/shell/NewAccountForm";
import type { AdminAccount } from "@/components/admin/shell/accountTypes";
import { adminAccounts } from "@/lib/texts";

function fetchAccounts(): Promise<AdminAccount[]> {
  return api
    .get<{ admins: AdminAccount[] }>("/api/admin/admins")
    .then((data) => data.admins || [])
    .catch(() => []);
}

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [scoping, setScoping] = useState<string | null>(null);

  const load = () => fetchAccounts().then(setAccounts);

  useEffect(() => {
    fetchAccounts().then(setAccounts);
    api
      .get<{ role: string }>("/api/admin/me")
      .then((data) => setViewerRole(data.role))
      .catch(() => setViewerRole(null));
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

  const picked = accounts.find((a) => a.id === scoping);

  if (picked) {
    return (
      <div className="admin-page space-y-4">
        <ActivityPicker account={picked} onBack={() => setScoping(null)} onSaved={load} />
      </div>
    );
  }

  return (
    <div className="admin-page space-y-4">
      <AdminToolHeader icon="users" title={adminAccounts.title} />

      <div className="space-y-2">
        {accounts.map((account) => (
          <AccountRow
            key={account.id}
            account={account}
            onScope={() => setScoping(account.id)}
            onDelete={() => remove(account.id)}
          />
        ))}
      </div>

      <NewAccountForm viewerRole={viewerRole} onCreated={load} />
    </div>
  );
}
