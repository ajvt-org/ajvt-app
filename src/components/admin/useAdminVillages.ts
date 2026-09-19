"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { villageChoices } from "@/lib/villages";
import { useFreshDataFromElsewhere } from "@/hooks/useFreshData";

export function useAdminVillages() {
  const [villages, setVillages] = useState<string[]>(villageChoices([]));

  const refresh = useCallback(() => {
    return api
      .get<{ villages: { name: string }[] }>("/api/admin/villages")
      .then((data) => setVillages(villageChoices((data.villages ?? []).map((v) => v.name))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFreshDataFromElsewhere(refresh);

  return { villages, refresh };
}
