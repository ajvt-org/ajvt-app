"use client";

import { useEffect, useState } from "react";
import { HOME_VILLAGE, villageChoices } from "@/lib/villages";
import { DEFAULT_AGES } from "./constants";

export function useFormLists() {
  const [ages, setAges] = useState<string[]>(DEFAULT_AGES);
  const [villages, setVillages] = useState<string[]>(villageChoices([HOME_VILLAGE]));

  useEffect(() => {
    fetch("/api/ages")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.ages?.length) setAges(data.ages);
      })
      .catch(() => {});

    fetch("/api/villages")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.villages?.length) setVillages(villageChoices(data.villages));
      })
      .catch(() => {});
  }, []);

  return { ages, villages };
}
