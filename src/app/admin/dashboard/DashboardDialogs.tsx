"use client";

import { useState } from "react";
import AgeGroupsDialog from "./AgeGroupsDialog";
import ManualAddDialog from "./ManualAddDialog";
import MemberImportDialog from "./MemberImportDialog";
import VillagesDialog from "./VillagesDialog";
import type { useDashboardLists } from "./useDashboardLists";

export type DashboardDialog = "manualAdd" | "import" | "ageGroups" | "villages";

export interface PayFor {
  id: string;
  fullName: string;
}

export function useDashboardDialogs() {
  const [open, setOpen] = useState<DashboardDialog | null>(null);
  const [payFor, setPayFor] = useState<PayFor | null>(null);

  return {
    open,
    payFor,
    show: setOpen,
    fill: (person: PayFor) => {
      setPayFor(person);
      setOpen("manualAdd");
    },
    close: () => {
      setOpen(null);
      setPayFor(null);
    },
  };
}

export default function DashboardDialogs({
  dialogs,
  lists,
  membershipFee,
  onPeopleAdded,
  onMembersChanged,
  onShowOtherVillage,
}: {
  dialogs: ReturnType<typeof useDashboardDialogs>;
  lists: ReturnType<typeof useDashboardLists>;
  membershipFee: number | null;
  onPeopleAdded: () => Promise<void>;
  onMembersChanged: () => void;
  onShowOtherVillage: () => void;
}) {
  if (dialogs.open === "manualAdd") {
    return (
      <ManualAddDialog
        ageGroups={lists.ageGroups}
        membershipFee={membershipFee}
        payFor={dialogs.payFor}
        onCreated={onPeopleAdded}
        onManageAgeGroups={() => dialogs.show("ageGroups")}
        onManageVillages={() => dialogs.show("villages")}
        onClose={dialogs.close}
      />
    );
  }
  if (dialogs.open === "import") {
    return (
      <MemberImportDialog
        ageGroups={lists.ageGroups}
        onImported={onPeopleAdded}
        onClose={dialogs.close}
      />
    );
  }
  if (dialogs.open === "ageGroups") {
    return (
      <AgeGroupsDialog
        ageGroups={lists.ageGroups}
        orphans={lists.orphanAges}
        onChanged={() => {
          lists.reloadAgeGroups();
          onMembersChanged();
        }}
        onClose={dialogs.close}
      />
    );
  }
  if (dialogs.open === "villages") {
    return (
      <VillagesDialog
        villages={lists.villages}
        otherCount={lists.otherVillageCount}
        unlisted={lists.unlistedVillages}
        onChanged={() => {
          lists.reloadVillages();
          onMembersChanged();
        }}
        onShowOther={() => {
          dialogs.close();
          onShowOtherVillage();
        }}
        onClose={dialogs.close}
      />
    );
  }
  return null;
}
