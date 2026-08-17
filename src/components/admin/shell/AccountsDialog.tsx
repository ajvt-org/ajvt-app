"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import DialogHeader from "@/components/DialogHeader";
import IconLabel from "@/components/IconLabel";
import Sheet from "@/components/Sheet";
import AccountRow from "./AccountRow";
import ActivityPicker from "./ActivityPicker";
import NewAccountForm from "./NewAccountForm";
import type { AdminAccount } from "./accountTypes";

function fetchAccounts(): Promise<AdminAccount[]> {
  return api
    .get<{ admins: AdminAccount[] }>("/api/admin/admins")
    .then((data) => data.admins || [])
    .catch(() => []);
}

export default function AccountsDialog({
  onBack,
  onClose,
}: {
  onBack: () => void;
  onClose: () => void;
}) {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [scoping, setScoping] = useState<string | null>(null);

  const load = () => fetchAccounts().then(setAccounts);

  useEffect(() => {
    fetchAccounts().then(setAccounts);
  }, []);

  async function remove(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الحساب؟")) return;
    try {
      await api.del(`/api/admin/admins/${id}`);
      await load();
    } catch (e) {
      alert(errorMessage(e));
    }
  }

  const picked = accounts.find((a) => a.id === scoping);

  return (
    <Sheet onClose={onClose}>
      {picked ? (
        <ActivityPicker account={picked} onBack={() => setScoping(null)} onSaved={load} />
      ) : (
        <>
          <DialogHeader
            title={<IconLabel name="users">حسابات المشرفين</IconLabel>}
            onBack={onBack}
          />

          <div className="p-5 space-y-4">
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

            <NewAccountForm onCreated={load} />
          </div>
        </>
      )}
    </Sheet>
  );
}
