"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AgeGroup, OrphanAge, Village } from "./types";

interface VillagesResponse {
  villages: Village[];
  otherCount: number;
  unlisted: OrphanAge[];
}

export function useDashboardLists() {
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [orphanAges, setOrphanAges] = useState<OrphanAge[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [otherVillageCount, setOtherVillageCount] = useState(0);
  const [unlistedVillages, setUnlistedVillages] = useState<OrphanAge[]>([]);

  function reloadAgeGroups() {
    return api
      .get<{ ageGroups: AgeGroup[]; orphans: OrphanAge[] }>("/api/admin/age-groups")
      .then((data) => {
        setAgeGroups(data.ageGroups || []);
        setOrphanAges(data.orphans || []);
      })
      .catch(() => {});
  }

  function reloadVillages() {
    return api
      .get<VillagesResponse>("/api/admin/villages")
      .then((data) => {
        setVillages(data.villages || []);
        setOtherVillageCount(data.otherCount || 0);
        setUnlistedVillages(data.unlisted || []);
      })
      .catch(() => {});
  }

  useEffect(() => {
    reloadAgeGroups();
    reloadVillages();
  }, []);

  return {
    ageGroups,
    orphanAges,
    villages,
    otherVillageCount,
    unlistedVillages,
    reloadAgeGroups,
    reloadVillages,
  };
}
