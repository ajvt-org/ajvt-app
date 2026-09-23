"use client";

import { useEffect, useState } from "react";

export interface GiftActivity {
  id: string;
  title: string;
}

export interface GiftActivityState {
  checking: boolean;
  activity: GiftActivity | null;
  refused: boolean;
}

const REFUSED: GiftActivityState = { checking: false, activity: null, refused: true };

export function useGiftActivity(activityId: string | null): GiftActivityState {
  const [state, setState] = useState<GiftActivityState>({
    checking: !!activityId,
    activity: null,
    refused: false,
  });

  useEffect(() => {
    if (!activityId) return;
    fetch(`/api/activities/${encodeURIComponent(activityId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const found = data?.activity;
        setState(
          found?.takesGifts
            ? { checking: false, activity: { id: found.id, title: found.title }, refused: false }
            : REFUSED,
        );
      })
      .catch(() => setState(REFUSED));
  }, [activityId]);

  return state;
}
